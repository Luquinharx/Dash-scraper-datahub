import requests
from datetime import datetime, timedelta
import logging

logging.basicConfig(level=logging.INFO, format="%(message)s")

FIREBASE_DB_URL = "https://deadclanbb-1f05e-default-rtdb.firebaseio.com/"

def clean_old_firebase_data(keep_days=14):
    """
    Remove dados da chave 'daily' do Firebase que sejam mais velhos que 'keep_days'.
    Isso vai limpar dados velhos (lixo) mantendo apenas os backups dos últimos dias, 
    livrando espaço do armazenamento e economizando leituras.
    """
    cutoff_date = (datetime.now() - timedelta(days=keep_days)).strftime("%Y-%m-%d")
    logging.info(f"Procurando dados 'daily' antes de {cutoff_date} para excluir...")
    
    try:
        # Pega de forma shallow (só as chaves das datas para não consumir muita rede)
        resp = requests.get(FIREBASE_DB_URL + "daily.json?shallow=true")
        
        if resp.status_code != 200:
            logging.error(f"Erro ao carregar daily: {resp.text}")
            return
            
        data = resp.json()
        if not data:
            logging.info("Nenhuma chave 'daily' encontrada.")
            return

        # data é um dict com as chaves tipo {"2023-01-01": true, "2023-01-02": true...}
        dates = sorted(data.keys())
        to_delete = [d for d in dates if d < cutoff_date]
        
        if not to_delete:
            logging.info("Nenhum dado velho (lixo) encontrado para excluir!")
            return
            
        logging.info(f"Encontrados {len(to_delete)} dias antigos para deletar...")
        
        for d in to_delete:
            del_url = FIREBASE_DB_URL + f"daily/{d}.json"
            logging.info(f"Deletando: daily/{d}")
            del_resp = requests.delete(del_url)
            if del_resp.status_code != 200:
                logging.error(f"Erro ao deletar {d}: {del_resp.text}")
                
        logging.info("🔥 Limpeza concluída com sucesso! Espaço e banco de dados aliviados.")

    except Exception as e:
        logging.error(f"Erro no processo de limpeza: {e}")

if __name__ == "__main__":
    # Mantendo apenas o histórico dos últimos 14 dias:
    clean_old_firebase_data(keep_days=14)
