    const { useState, useRef, useEffect, useMemo } = React;

    const formatTextForDisplay = (text, maxLength) => {
      if (!text || text.length <= maxLength) {
        return text;
      }
      const chunks = [];
      for (let i = 0; i < text.length; i += maxLength) {
        chunks.push(text.substring(i, i + maxLength));
      }
      return chunks.join('\n');
    };

    const RecordsTable = ({
      recordList,
      isDashboard = false,
      editingRecord,
      setEditingRecord,
      handleSaveEdit,
      handleCancelEdit,
      handleStartEdit,
      handleDeleteRecord
    }) => (
      <div className="overflow-x-auto">
        <table className="w-full mt-4 border-collapse">
          <thead>
            <tr className="bg-gray-200">
              <th className="border p-2">Data</th>
              <th className="border p-2">Hora</th>
              <th className="border p-2">Técnico</th>
              <th className="border p-2">Item</th>
              <th className="border p-2">Status</th>
              <th className="border p-2 max-w-xs">Observações</th>
              {!isDashboard && <th className="border p-2">Ações</th>}
            </tr>
          </thead>
          <tbody>
            {recordList.map((record, mapIndex) => {
              const originalIndex = isDashboard ? record.originalIndex : mapIndex;
              const isEditing = editingRecord.index === originalIndex;

              return (
                <tr key={originalIndex} className="hover:bg-gray-50">
                  <td className="border px-2 py-1 align-top">{record.Data}</td>
                  <td className="border px-2 py-1 align-top">{record.Hora}</td>
                  <td className="border px-2 py-1 align-top">{record.Técnico}</td>
                  <td className="border px-2 py-1 align-top">{record['Item Verificado']}</td>
                  <td className="border px-2 py-1 align-top">{record.Status}</td>
                  <td className="border px-2 py-1 max-w-xs align-top">
                    {isEditing ? (
                      <textarea
                        value={editingRecord.text}
                        onChange={(e) => setEditingRecord({ ...editingRecord, text: e.target.value })}
                        className="w-full p-1 border rounded"
                        rows="4"
                        autoFocus
                      />
                    ) : (
                      <p className="whitespace-pre-wrap break-words leading-snug m-0">
                        {formatTextForDisplay(record.Observações, 22)}
                      </p>
                    )}
                  </td>
                  {!isDashboard && (
                    <td className="border px-2 py-1 align-top">
                      <div className="flex flex-col space-y-2 md:flex-row md:space-y-0 md:space-x-2">
                        {isEditing ? (
                          <>
                            <button onClick={handleSaveEdit} className="bg-green-500 text-white px-2 py-1 rounded text-xs hover:bg-green-600">Salvar</button>
                            <button onClick={handleCancelEdit} className="bg-gray-500 text-white px-2 py-1 rounded text-xs hover:bg-gray-600">Cancelar</button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => handleStartEdit(originalIndex, record.Observações)} className="bg-yellow-500 text-white px-2 py-1 rounded text-xs hover:bg-yellow-600">Editar</button>
                            <button onClick={() => handleDeleteRecord(originalIndex)} className="bg-red-500 text-white px-2 py-1 rounded text-xs hover:bg-red-600">Excluir</button>
                          </>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );


    function App() {
      const [technician, setTechnician] = useState('');
      const [currentItemIndex, setCurrentItemIndex] = useState(-1);
      const [status, setStatus] = useState('');
      const [observations, setObservations] = useState('');
      const [records, setRecords] = useState([]);
      const [error, setError] = useState('');
      const [successMessage, setSuccessMessage] = useState('');
      
      const [excelData, setExcelData] = useState(null);
      const [fileName, setFileName] = useState('');
      const [fileType, setFileType] = useState('');
      const [fileHandle, setFileHandle] = useState(null);

      const [showDashboard, setShowDashboard] = useState(false);
      const [filterData, setFilterData] = useState('');
      const [filterTechnician, setFilterTechnician] = useState('');
      const [filterStatus, setFilterStatus] = useState('');
      const [chartType, setChartType] = useState('bar');
      const chartRef = useRef(null);
      const chartInstanceRef = useRef(null);

      const [editingRecord, setEditingRecord] = useState({ index: null, text: '' });

      const checklistItems = [
        "Temperatura e Umidade (Sensores)",
        "Limpeza Física do Ambiente",
        "Verificação de Cabos e Conexões",
      ];

      const handleDeleteRecord = (indexToDelete) => {
        if (window.confirm('Tem certeza de que deseja excluir este registro?')) {
          const updatedRecords = records.filter((_, index) => index !== indexToDelete);
          setRecords(updatedRecords);
        }
      };

      const handleStartEdit = (indexToEdit, currentText) => {
        setEditingRecord({ index: indexToEdit, text: currentText });
      };

      const handleCancelEdit = () => {
        setEditingRecord({ index: null, text: '' });
      };

      const handleSaveEdit = () => {
        if (editingRecord.index === null) return;
        const updatedRecords = records.map((record, index) => {
          if (index === editingRecord.index) {
            return { ...record, Observações: editingRecord.text || 'Nenhuma' };
          }
          return record;
        });
        setRecords(updatedRecords);
        handleCancelEdit();
      };

      const handleOpenFile = async () => {
        if (!window.showOpenFilePicker) {
          setError('Seu navegador não suporta a edição direta de arquivos. Tente usar o Chrome ou Edge.');
          return;
        }

        try {
          const [handle] = await window.showOpenFilePicker({
            types: [{
              description: 'Planilhas',
              accept: {
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
                'application/vnd.ms-excel': ['.xls'],
                'application/vnd.oasis.opendocument.spreadsheet': ['.ods']
              }
            }],
            multiple: false
          });
          
          const file = await handle.getFile();
          setFileHandle(handle);
          setFileName(file.name);
          setFileType(file.name.split('.').pop());

          const reader = new FileReader();
          reader.onload = (e) => {
            try {
              const data = new Uint8Array(e.target.result);
              const workbook = XLSX.read(data, { type: 'array' });
              const sheetName = workbook.SheetNames.includes('Checklist Datacenter') ? 'Checklist Datacenter' : workbook.SheetNames[0] || 'Sheet1';
              const worksheet = workbook.Sheets[sheetName];
              const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
              const loadedRecords = jsonData.slice(1).map(row => ({
                Data: row[0] || '', Hora: row[1] || '', Técnico: row[2] || '', 'Item Verificado': row[3] || '', Status: row[4] || '', Observações: row[5] || ''
              })).filter(r => r.Data || r.Hora || r.Técnico || r['Item Verificado'] || r.Status || r.Observações);

              setExcelData({ workbook, sheetName });
              setRecords(loadedRecords);
              setError('');
              setSuccessMessage(`Arquivo "${file.name}" aberto com ${loadedRecords.length} registros.`);
            } catch (err) {
              setError('Erro ao ler o arquivo: ' + err.message);
              setSuccessMessage('');
              setFileHandle(null);
            }
          };
          reader.readAsArrayBuffer(file);

        } catch (err) {
          console.log('Seleção de arquivo cancelada ou falhou.', err);
        }
      };

      const startChecklist = () => {
        if (!fileHandle) {
          setError('Por favor, abra um arquivo antes de iniciar.');
          setSuccessMessage('');
          return;
        }
        if (!technician.trim()) {
          setError('Por favor, preencha o nome do técnico.');
          setSuccessMessage('');
          return;
        }
        setError('');
        setSuccessMessage('');
        setCurrentItemIndex(0);
        setShowDashboard(false);
      };

      const handleSubmit = () => {
        if (!['OK', 'ALERTA', 'FALHA'].includes(status.toUpperCase())) {
          setError('Status deve ser OK, Alerta ou Falha.');
          setSuccessMessage('');
          return;
        }
        const now = new Date();
        const newRecord = {
          Data: now.toLocaleDateString('pt-BR'),
          Hora: now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          Técnico: technician,
          'Item Verificado': checklistItems[currentItemIndex],
          Status: status.toUpperCase(),
          Observações: observations || 'Nenhuma'
        };
        setRecords([...records, newRecord]);
        setStatus('');
        setObservations('');
        setError('');
        
        if (currentItemIndex + 1 < checklistItems.length) {
          setCurrentItemIndex(currentItemIndex + 1);
        } else {
          setCurrentItemIndex(-1);
          setTechnician('');
          setSuccessMessage('Checklist finalizado com sucesso!');
        }
      };

      const saveToFile = async () => {
        if (!fileHandle) {
          setError('Nenhuma referência de arquivo encontrada para salvar.');
          return;
        }
        if (records.length === 0) {
          setError('Nenhum registro para salvar.');
          return;
        }

        try {
          const { workbook, sheetName } = excelData;
          const headers = ['Data', 'Hora', 'Técnico', 'Item Verificado', 'Status', 'Observações'];
          const worksheetData = [headers, ...records.map(r => [r.Data, r.Hora, r.Técnico, r['Item Verificado'], r.Status, r.Observações])];
          const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
          worksheet['!cols'] = [
            { wch: 12 }, { wch: 10 }, { wch: 20 }, { wch: 30 }, { wch: 10 }, { wch: 40 }
          ];
          workbook.Sheets[sheetName] = worksheet;
          if (!workbook.SheetNames.includes(sheetName)) {
            workbook.SheetNames.push(sheetName);
          }
          const wbout = XLSX.write(workbook, { bookType: fileType, type: 'array' });

          const writable = await fileHandle.createWritable();
          await writable.write(wbout);
          await writable.close();

          setSuccessMessage(`Arquivo "${fileName}" atualizado e salvo com sucesso!`);
          setError('');
        } catch (err) {
          setError('Erro ao salvar o arquivo diretamente: ' + err.message);
          setSuccessMessage('');
        }
      };

      const prepareChartData = (filteredRecs, type) => {
        if (type === 'pie') {
          const statusCounts = { OK: 0, ALERTA: 0, FALHA: 0 };
          filteredRecs.forEach(record => {
            statusCounts[record.Status] = (statusCounts[record.Status] || 0) + 1;
          });
          return {
            labels: ['OK', 'ALERTA', 'FALHA'],
            datasets: [{
              label: 'Total de Status',
              data: [statusCounts.OK, statusCounts.ALERTA, statusCounts.FALHA],
              backgroundColor: ['rgba(75, 192, 192, 0.6)', 'rgba(255, 206, 86, 0.6)', 'rgba(255, 99, 132, 0.6)'],
              borderColor: ['rgba(75, 192, 192, 1)', 'rgba(255, 206, 86, 1)', 'rgba(255, 99, 132, 1)'],
              borderWidth: 1,
            }],
          };
        }
        const statusCounts = checklistItems.map(item => {
          const counts = { OK: 0, ALERTA: 0, FALHA: 0 };
          filteredRecs.filter(r => r['Item Verificado'] === item).forEach(r => { counts[r.Status] = (counts[r.Status] || 0) + 1; });
          return { item, counts };
        });
        return {
          labels: checklistItems,
          datasets: [
            { label: 'OK', data: statusCounts.map(sc => sc.counts.OK), backgroundColor: 'rgba(75, 192, 192, 0.6)', },
            { label: 'ALERTA', data: statusCounts.map(sc => sc.counts.ALERTA), backgroundColor: 'rgba(255, 206, 86, 0.6)', },
            { label: 'FALHA', data: statusCounts.map(sc => sc.counts.FALHA), backgroundColor: 'rgba(255, 99, 132, 0.6)', },
          ],
        };
      };

      const filteredRecords = useMemo(() => {
        return records
          .map((record, index) => ({ ...record, originalIndex: index }))
          .filter(record =>
            (!filterData || record.Data.includes(filterData)) &&
            (!filterTechnician || record.Técnico.toLowerCase().includes(filterTechnician.toLowerCase())) &&
            (!filterStatus || record.Status === filterStatus)
          );
      }, [records, filterData, filterTechnician, filterStatus]);

      useEffect(() => {
        if (chartInstanceRef.current) {
          chartInstanceRef.current.destroy();
        }
        if (showDashboard && filteredRecords.length > 0 && chartRef.current) {
          const ctx = chartRef.current.getContext('2d');
          const data = prepareChartData(filteredRecords, chartType);
          const options = {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { position: 'top' }, title: { display: true, text: chartType === 'pie' ? 'Distribuição Geral de Status' : 'Distribuição de Status por Item Verificado' } },
            scales: { y: { beginAtZero: true, stacked: chartType === 'bar', title: { display: true, text: 'Contagem' } }, x: { stacked: chartType === 'bar', title: { display: true, text: 'Itens Verificados' } } }
          };
          if (chartType === 'pie' || chartType === 'line') {
            options.scales.x.stacked = false;
            options.scales.y.stacked = false;
          }
          if (chartType === 'pie') {
             delete options.scales;
          }
          chartInstanceRef.current = new Chart(ctx, { type: chartType, data, options });
        }
      }, [showDashboard, filteredRecords, chartType]);

      return (
        <div className="max-w-4xl mx-auto bg-white p-8 rounded-lg shadow-lg my-8">
          <h1 className="text-2xl font-bold mb-6 text-center text-gray-800">Checklist do Datacenter</h1>

          {showDashboard ? (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold">Dashboard de Registros</h2>
                <button onClick={() => setShowDashboard(false)} className="bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700">Voltar</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Filtrar por Data</label>
                  <input type="text" value={filterData} onChange={(e) => setFilterData(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" placeholder="Ex: 16/07/2025" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Filtrar por Técnico</label>
                  <input type="text" value={filterTechnician} onChange={(e) => setFilterTechnician(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" placeholder="Nome do técnico" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Filtrar por Status</label>
                  <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md">
                    <option value="">Todos</option><option value="OK">OK</option><option value="ALERTA">Alerta</option><option value="FALHA">Falha</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Tipo de Gráfico</label>
                  <select value={chartType} onChange={(e) => setChartType(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md">
                    <option value="bar">Barra</option><option value="line">Linha</option><option value="pie">Pizza</option>
                  </select>
                </div>
              </div>
              <div className="bg-white p-4 rounded-lg shadow" style={{ height: '400px' }}><canvas ref={chartRef} /></div>
              <div>
                <h3 className="text-md font-medium mb-4">Registros Detalhados</h3>
                {filteredRecords.length === 0 ? (
                  <p className="text-gray-600">Nenhum registro corresponde aos filtros.</p>
                ) : (
                  <RecordsTable
                    recordList={filteredRecords}
                    isDashboard={true}
                    editingRecord={editingRecord}
                    setEditingRecord={setEditingRecord}
                    handleSaveEdit={handleSaveEdit}
                    handleCancelEdit={handleCancelEdit}
                    handleStartEdit={handleStartEdit}
                    handleDeleteRecord={handleDeleteRecord}
                  />
                )}
              </div>
            </div>
          ) : currentItemIndex === -1 ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Arquivo de Dados</label>
                <button 
                  onClick={handleOpenFile} 
                  className="mt-1 w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700"
                >
                  Abrir Arquivo Excel
                </button>
                {fileName && <p className="mt-2 text-sm text-gray-600">Arquivo aberto: <strong>{fileName}</strong></p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Nome do Técnico</label>
                <input type="text" value={technician} onChange={(e) => setTechnician(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" placeholder="Digite seu nome" />
              </div>
              {error && <p className="text-red-500">{error}</p>}
              {successMessage && <p className="text-green-500">{successMessage}</p>}
              <button onClick={startChecklist} className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700">Iniciar Checklist</button>
              {records.length > 0 && (
                <button onClick={() => setShowDashboard(true)} className="w-full bg-purple-600 text-white py-2 rounded-md hover:bg-purple-700 mt-2">Visualizar Dashboard</button>
              )}
              {records.length > 0 && (
                <div>
                  <h2 className="text-lg font-semibold mt-6">Registros</h2>
                  <RecordsTable
                    recordList={records}
                    isDashboard={false}
                    editingRecord={editingRecord}
                    setEditingRecord={setEditingRecord}
                    handleSaveEdit={handleSaveEdit}
                    handleCancelEdit={handleCancelEdit}
                    handleStartEdit={handleStartEdit}
                    handleDeleteRecord={handleDeleteRecord}
                  />
                  <button onClick={saveToFile} className="mt-4 w-full bg-green-600 text-white py-2 rounded-md hover:bg-green-700">
                    Salvar Alterações no Arquivo
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Item: {checklistItems[currentItemIndex]}</h2>
              {checklistItems[currentItemIndex] === "Temperatura e Umidade (Sensores)" && (
                <div className="bg-yellow-100 border-l-4 border-yellow-500 p-4 mb-4">
                  <p className="text-sm text-gray-800">
                    <strong>Temperatura:</strong><br />• Faixa ideal: 18°C a 25°C<br />
                    <strong>Umidade:</strong><br />• Faixa ideal: 45% a 55%
                  </p>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <select value={status} onChange={(e) => setStatus(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md">
                  <option value="">Selecione</option><option value="OK">OK</option><option value="ALERTA">Alerta</option><option value="FALHA">Falha</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Observações</label>
                <textarea value={observations} onChange={(e) => setObservations(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" placeholder="Digite observações (opcional)" rows="4" />
              </div>
              {error && <p className="text-red-500">{error}</p>}
              <button onClick={handleSubmit} className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700">
                {currentItemIndex + 1 === checklistItems.length ? 'Finalizar Checklist' : 'Próximo Item'}
              </button>
            </div>
          )}
        </div>
      );
    }

    const root = ReactDOM.createRoot(document.getElementById('root'));
    root.render(<App />);

