#!/bin/bash

echo "🚀 Sincronizando arquivos com o servidor..."

# O rsync vai sincronizar o diretório atual (.) com o diretório remoto.
# -a: modo "archive", preserva permissões, etc.
# -v: modo "verbose", mostra os arquivos que estão sendo copiados.
# -z: comprime os dados durante a transferência.
# --delete: apaga arquivos no servidor que não existem mais na sua máquina.

scp -r ./* bktadmin@192.168.10.35:/var/www/html/


echo "✅ Sincronização finalizada com sucesso!"