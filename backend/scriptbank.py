import datetime as dt
import json
import re
import time
import traceback
import os

import requests
from selenium import webdriver
from selenium.common.exceptions import NoAlertPresentException, StaleElementReferenceException
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.firefox.service import Service as FirefoxService
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

# --- CONFIGURACAO ---
USUARIO = "logbb"
SENHA = "leoleobr3"
URL_STORAGE_LOG = "https://fairview.deadfrontier.com/onlinezombiemmo/index.php?page=89"
FIREBASE_BASE_URL = "https://deadclanbb-1f05e-default-rtdb.firebaseio.com/"

TAB_KEY = "bank"
TAB_LABEL = "Bank"
FIREBASE_BATCH_SIZE = 100
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
STATE_FILE = os.path.join(SCRIPT_DIR, "clan_bank_state.json")
SUMMARY_FILE = os.path.join(SCRIPT_DIR, "clan_logs_summary.json")
HEADLESS = True # Deixe como True pois a VPS não tem tela
INTERVALO_HORAS = 1
RETRY_INICIAL_SEGUNDOS = 60
MAX_TENTATIVAS_COLETA = 3
RETRY_FALHA_COLETA_SEGUNDOS = 30
SELENIUM_COMMAND_TIMEOUT_SEGUNDOS = 300
# --------------------


def now_iso():
    return dt.datetime.now(dt.UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def sanitize_key(value):
    key = str(value).strip()
    if not key:
        key = "unknown"
    return re.sub(r"[.#$\[\]/]", "_", key)


def load_last_seen_id():
    try:
        with open(STATE_FILE, "r", encoding="utf-8") as f_state:
            data = json.load(f_state)
            return str(data.get("last_seen_row_id", "")).strip() or None
    except Exception:
        return None


def save_last_seen_id(last_seen_row_id, run_id):
    payload = {
        "last_seen_row_id": str(last_seen_row_id),
        "updated_at": now_iso(),
        "run_id": run_id,
    }
    with open(STATE_FILE, "w", encoding="utf-8") as f_state:
        json.dump(payload, f_state, ensure_ascii=False, indent=2)


def is_old_or_same(current_id, last_seen_id):
    if not current_id or not last_seen_id:
        return False
    if str(current_id) == str(last_seen_id):
        return True
    if str(current_id).isdigit() and str(last_seen_id).isdigit():
        return int(current_id) <= int(last_seen_id)
    return False


def firebase_put(path, payload):
    url = f"{FIREBASE_BASE_URL.rstrip('/')}/{path}.json"
    resp = requests.put(url, json=payload, timeout=60)
    resp.raise_for_status()


def firebase_patch(path, payload):
    url = f"{FIREBASE_BASE_URL.rstrip('/')}/{path}.json"
    resp = requests.patch(url, json=payload, timeout=60)
    if not resp.ok:
        print("Firebase PATCH falhou:", resp.text[:500])
    resp.raise_for_status()


def firebase_delete(path):
    url = f"{FIREBASE_BASE_URL.rstrip('/')}/{path}.json"
    resp = requests.delete(url, timeout=60)
    if not resp.ok:
        print("Firebase DELETE falhou:", resp.text[:500])
    resp.raise_for_status()


def obter_popup_logs(driver):
    return driver.find_element(By.XPATH, "//div[contains(@class,'genericActionBox')][.//table[@id='clanLogs']]")


def fechar_alerta_se_existir(driver):
    try:
        alert = driver.switch_to.alert
        print(f"Alerta detectado: {alert.text}")
        alert.accept()
        return True
    except NoAlertPresentException:
        return False


def abrir_popup_logs(driver):
    wait = WebDriverWait(driver, 20)
    try:
        botao_logs = wait.until(EC.presence_of_element_located((By.XPATH, "//button[normalize-space()='Logs']")))
        driver.execute_script("arguments[0].click();", botao_logs)
    except Exception as e:
        print(f"Não foi possível clicar em Logs via JS: {e}")

    wait.until(EC.presence_of_element_located((By.XPATH, "//div[contains(@class,'genericActionBox')]//div[contains(.,'Clan Logs')]")))


def selecionar_aba_logs(driver, aba_nome):
    wait = WebDriverWait(driver, 20)
    seletor = f"//div[contains(@class,'genericActionBox')]//button[normalize-space()='{aba_nome}']"
    botao = wait.until(EC.presence_of_element_located((By.XPATH, seletor)))
    driver.execute_script("arguments[0].click();", botao)

    wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "#clanLogs")))
    wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "#clanLogs tr")))


def obter_headers_e_linhas(driver):
    for _ in range(3):
        try:
            headers = [th.text.strip().lower() for th in driver.find_elements(By.CSS_SELECTOR, "#clanLogs tr th")]
            rows = driver.find_elements(By.CSS_SELECTOR, "#clanLogs tr.fakeItem")
            linhas = []
            for row in rows:
                cols = [td.text.strip() for td in row.find_elements(By.TAG_NAME, "td")]
                if cols:
                    linhas.append(cols)
            return headers, linhas
        except StaleElementReferenceException:
            time.sleep(0.5)

    return [], []


def navegar_proxima_pagina(driver, pagina_atual):
    wait = WebDriverWait(driver, 30) # Aumentado para 30s por conta da VPS
    try:
        print(f"[{TAB_LABEL}] Tentando navegar para a página {pagina_atual + 1} via JS...")

        # Captura o ID da primeira transacao ANTES de clicar (sua excelente sacada!)
        old_first_id = None
        try:
            primeiros_tds = driver.find_elements(By.CSS_SELECTOR, "#clanLogs tr.fakeItem td")
            if primeiros_tds:
                old_first_id = primeiros_tds[0].text.strip()
        except Exception:
            pass

        # Procuramos o elemento nativamente
        botoes = driver.find_elements(By.XPATH, "//div[contains(@class,'opElem')]//button[normalize-space()='>']")
        if not botoes:
            print(f"[{TAB_LABEL}] Botão '>' não encontrado no DOM.")
            return False

        btnNext = botoes[0]
        if not btnNext.is_enabled() or btnNext.get_attribute("disabled"):
            print(f"[{TAB_LABEL}] Botão '>' está desativado.")
            return False

        # Despachamos um MouseEvent completo para simular um humano, vital para jogos em HTML5/JS
        script_click = "arguments[0].dispatchEvent(new MouseEvent('click', {bubbles: true, cancelable: true, view: window}));"
        driver.execute_script(script_click, btnNext)
        print(f"[{TAB_LABEL}] Clique despachado! Aguardando os dados da tabela atualizarem...")

        def check_page_change(d):
            try:
                # 1. Validação primária: Pelo ID da transação (melhor forma!)
                if old_first_id:
                    tds = d.find_elements(By.CSS_SELECTOR, "#clanLogs tr.fakeItem td")
                    if tds:
                        novo_id = tds[0].text.strip()
                        if novo_id and novo_id != old_first_id:
                            return True

                # 2. Validação secundária: Pelo número no input
                val = d.execute_script("var el = document.querySelector(\"div.opElem input\"); return el ? el.value : null;")
                if str(val) == str(pagina_atual + 1):
                    return True

                return False
            except Exception:
                return False

        wait.until(check_page_change)
        time.sleep(1.0) # Intervalo mais tolerante para a VPS re-renderizar o DOM
        print(f"[{TAB_LABEL}] Sucesso ao navegar para a página {pagina_atual + 1}!")
        return True
    except Exception as e:
        print(f"Erro ao navegar para a pagina {pagina_atual+1}: {type(e).__name__}")
        traceback.print_exc()
        return False


def extrair_bank_e_enviar(driver, run_id, last_seen_row_id=None):
    selecionar_aba_logs(driver, TAB_LABEL)
    popup = obter_popup_logs(driver)

    nav_input = popup.find_element(By.CSS_SELECTOR, "div.opElem input[type='number']")
    total_paginas = int(nav_input.get_attribute("max") or "1")
    print(f"[{TAB_LABEL}] total de páginas: {total_paginas}")

    headers_ref = []
    total_registros = 0
    lote_firebase = {}
    newest_row_id = None
    encontrou_limite = False

    for pagina in range(1, total_paginas + 1):
        WebDriverWait(driver, 20).until(EC.presence_of_element_located((By.CSS_SELECTOR, "#clanLogs tr")))
        headers, linhas = obter_headers_e_linhas(driver)

        if not headers_ref:
            headers_ref = headers if headers else ["#", "username", "action", "currency", "time"]

        for idx, linha in enumerate(linhas, start=1):
            row_map = {}
            for i, h in enumerate(headers_ref):
                row_map[h] = linha[i] if i < len(linha) else ""

            row_id = row_map.get("#") or f"{pagina}_{idx}"
            if is_old_or_same(row_id, last_seen_row_id):
                encontrou_limite = True
                break

            if newest_row_id is None:
                newest_row_id = row_id

            firebase_fields = {sanitize_key(k): v for k, v in row_map.items()}
            row_key = sanitize_key(row_id)

            registro = {
                "run_id": run_id,
                "tab": TAB_KEY,
                "pagina": pagina,
                "ingested_at": now_iso(),
                "fields": firebase_fields,
            }
            lote_firebase[row_key] = registro
            total_registros += 1

            if len(lote_firebase) >= FIREBASE_BATCH_SIZE:
                firebase_patch(f"clan_logs/runs/{run_id}/{TAB_KEY}", lote_firebase)
                lote_firebase = {}

        if encontrou_limite:
            break

        if pagina % 50 == 0 or pagina == total_paginas:
            print(f"[{TAB_LABEL}] progresso: página {pagina}/{total_paginas} - novos {total_registros}")

        if pagina < total_paginas:
            if not navegar_proxima_pagina(driver, pagina):
                raise RuntimeError(f"[{TAB_LABEL}] Falha ao navegar para a pagina {pagina + 1}.")

    if lote_firebase:
        firebase_patch(f"clan_logs/runs/{run_id}/{TAB_KEY}", lote_firebase)

    return {
        "tab": TAB_KEY,
        "label": TAB_LABEL,
        "total_paginas": total_paginas,
        "total_registros_novos": total_registros,
        "headers": headers_ref,
        "last_seen_before_run": last_seen_row_id,
        "newest_row_id": newest_row_id,
        "cutoff_reached": encontrou_limite,
    }


def build_firefox_driver():
    options = webdriver.FirefoxOptions()
    options.binary_location = "/usr/lib/firefox/firefox"
    if HEADLESS:
        options.add_argument("--headless")

    # --- OTIMIZACOES PARA VPS FRACA ---
    options.set_preference("permissions.default.image", 2)
    options.set_preference("browser.cache.disk.enable", False)
    options.set_preference("browser.cache.memory.enable", False)
    options.set_preference("browser.cache.offline.enable", False)
    options.set_preference("network.http.use-cache", False)

    profile_path = os.path.join(SCRIPT_DIR, "firefox_profile")
    if not os.path.exists(profile_path):
        os.makedirs(profile_path)
    options.add_argument("-profile")
    options.add_argument(profile_path)

    service = FirefoxService("/usr/local/bin/geckodriver")
    driver = webdriver.Firefox(service=service, options=options)
    try:
        driver.command_executor.set_timeout(SELENIUM_COMMAND_TIMEOUT_SEGUNDOS)
    except Exception:
        try:
            driver.command_executor._client_config.timeout = SELENIUM_COMMAND_TIMEOUT_SEGUNDOS
        except Exception:
            pass
    return driver


def executar_scraper_bank():
    run_id = dt.datetime.now(dt.UTC).strftime("%Y%m%d_%H%M%S")
    last_seen_row_id = load_last_seen_id()
    print(f"Último ID salvo no estado local: {last_seen_row_id}")

    for tentativa in range(1, MAX_TENTATIVAS_COLETA + 1):
        driver = None
        try:
            print(f"\n[Tentativa {tentativa}/{MAX_TENTATIVAS_COLETA}] Iniciando Firefox (Gecko)...")
            driver = build_firefox_driver()

            print("Acessando a página inicial...")
            driver.get("https://fairview.deadfrontier.com/onlinezombiemmo/index.php")
            time.sleep(2)

            if "Logout" not in driver.page_source:
                try:
                    user_field = driver.find_element(By.CSS_SELECTOR, "#frmLogin input[name='user']")
                    pass_field = driver.find_element(By.CSS_SELECTOR, "#frmLogin input[name='passwrd']")
                except Exception:
                    driver.get("https://fairview.deadfrontier.com/onlinezombiemmo/ExternalLoginReg.php")
                    time.sleep(2)
                    user_field = driver.find_element(By.CSS_SELECTOR, "#frmLogin input[name='user']")
                    pass_field = driver.find_element(By.CSS_SELECTOR, "#frmLogin input[name='passwrd']")

                print(f"Preenchendo credenciais para: {USUARIO}")
                user_field.clear()
                user_field.send_keys(USUARIO)
                pass_field.clear()
                pass_field.send_keys(SENHA)
                pass_field.send_keys(Keys.RETURN)
                print("Login submetido.")

                time.sleep(3)
                fechar_alerta_se_existir(driver)

                if "enhanced security" in driver.page_source.lower() and "authentication code" in driver.page_source.lower():
                    print("\n[!] Tela de Enhanced Security (Email) detectada!")
                    codigo_2fa = input(">>> Digite o código de 6 dígitos recebido no seu e-mail: ").strip()
                    script_js = f"""
                    var inputs = document.querySelectorAll('input[type="text"], input[type="password"], input[type="number"]');
                    var targetInput = null;
                    for (var i = 0; i < inputs.length; i++) {{
                        if (inputs[i].type !== 'hidden' && inputs[i].name !== 'user' && inputs[i].name !== 'passwrd') {{
                            targetInput = inputs[i]; break;
                        }}
                    }}
                    if (targetInput) {{
                        targetInput.value = '{codigo_2fa}';
                        var btn = document.querySelector('input[type="submit"], button[type="submit"], input[value="Submit"]');
                        if (btn) btn.click();
                        else if (targetInput.form) targetInput.form.submit();
                        return true;
                    }}
                    return false;
                    """
                    if driver.execute_script(script_js):
                        print("Código injetado com JS! Aguardando o jogo...")
                        time.sleep(5)
                    else:
                        raise RuntimeError("Campo de 2FA não localizado.")
            else:
                print("Já logado de primeira! (Cookies restaurados do firefox_profile)")

            print(f"Acessando o clã via link direto: {URL_STORAGE_LOG}")
            driver.get(URL_STORAGE_LOG)
            time.sleep(3)
            fechar_alerta_se_existir(driver)

            print("Abrindo tabela Bank...")
            abrir_popup_logs(driver)

            resumo_bank = extrair_bank_e_enviar(driver, run_id, last_seen_row_id=last_seen_row_id)

            novo_ultimo_id = resumo_bank.get("newest_row_id")
            if novo_ultimo_id:
                save_last_seen_id(novo_ultimo_id, run_id)

            resumo_geral = {
                "run_id": run_id,
                "source_url": URL_STORAGE_LOG,
                "ingested_at": now_iso(),
                "tabs": {
                    TAB_KEY: resumo_bank,
                },
            }

            try:
                firebase_put(f"clan_logs_meta/runs/{run_id}", resumo_geral)
                firebase_put("clan_logs_meta/latest_run", resumo_geral)
            except Exception as meta_err:
                print(f"ALERTA: não foi possível gravar clan_logs_meta (coleta principal já salva): {meta_err}")

            with open(SUMMARY_FILE, "w", encoding="utf-8") as f_summary:
                json.dump(resumo_geral, f_summary, ensure_ascii=False, indent=2)

            print("-> Extração Finalizada com Sucesso!")
            return True

        except Exception as e:
            print(f"Ocorreu um erro interno (tentativa {tentativa}/{MAX_TENTATIVAS_COLETA}): {e}")
            traceback.print_exc()
            if tentativa < MAX_TENTATIVAS_COLETA:
                print(f"Reiniciando tentativa em {RETRY_FALHA_COLETA_SEGUNDOS}s...")
                time.sleep(RETRY_FALHA_COLETA_SEGUNDOS)
        finally:
            if driver is not None:
                try:
                    driver.quit()
                except Exception:
                    pass

    print("Todas as tentativas falharam. Removendo coleta parcial para não poluir os dados...")
    try:
        firebase_delete(f"clan_logs/runs/{run_id}")
    except Exception as cleanup_err:
        print(f"ALERTA: não foi possível limpar run parcial em clan_logs/runs/{run_id}: {cleanup_err}")
    try:
        firebase_delete(f"clan_logs_meta/runs/{run_id}")
    except Exception:
        pass
    return False


if __name__ == "__main__":
    intervalo_segundos = int(INTERVALO_HORAS * 3600)
    print("Buscador do Bank online - modo incremental sem duplicar")
    print("Coleta inicial imediata ao iniciar o processo (com retry até sucesso).")
    print(f"Ciclo continuo - Repetição a cada: {INTERVALO_HORAS} hora(s).")

    # Primeira coleta imediata ao subir o script (forçada até conseguir)
    while True:
        inicio = now_iso()
        print(f"\n[+] Iniciando coleta inicial as: {inicio}")
        if executar_scraper_bank():
            print("[+] Coleta inicial concluída com sucesso.")
            break
        print(f"[!] Coleta inicial falhou. Nova tentativa em {RETRY_INICIAL_SEGUNDOS}s...")
        time.sleep(RETRY_INICIAL_SEGUNDOS)

    # Depois segue no ciclo de 1 hora
    while True:
        print(f"Zzz.. Rotina em descanso.. Próxima em ~{INTERVALO_HORAS} hora(s).")
        time.sleep(intervalo_segundos)
        inicio = now_iso()
        print(f"\n[+] Iniciando rotina as: {inicio}")
        executar_scraper_bank()
