const { useState, useRef, useEffect } = React;

function App() {
  const [technician, setTechnician] = useState('');
  const [currentItemIndex, setCurrentItemIndex] = useState(-1);
  const [status, setStatus] = useState('');
  const [observations, setObservations] = useState('');
  const [records, setRecords] = useState([]);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState(''); // Novo estado para mensagem de sucesso
  const [excelData, setExcelData] = useState(null);
  const [fileName, setFileName] = useState('');
  const [fileType, setFileType] = useState('');
  const [showDashboard, setShowDashboard] = useState(false);
  const [showDashboardPrompt, setShowDashboardPrompt] = useState(false);
  const [filterData, setFilterData] = useState('');
  const [filterTechnician, setFilterTechnician] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const fileInputRef = useRef(null);
  const chartRef = useRef(null);

  const checklistItems = [
    "Temperatura e Umidade (Sensores)",
    "Limpeza Física do Ambiente",
    "Verificação de Cabos e Conexões",
  ];

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) {
      setError('Por favor, selecione um arquivo.');
      setSuccessMessage('');
      return;
    }
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls') && !file.name.endsWith('.ods')) {
      setError('Por favor, selecione um arquivo Excel (.xlsx, .xls) ou LibreOffice (.ods).');
      setSuccessMessage('');
      return;
    }

    setFileName(file.name);
    setFileType(file.name.split('.').pop());
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames.includes('Checklist Datacenter')
          ? 'Checklist Datacenter'
          : workbook.SheetNames[0] || 'Sheet1';
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        setExcelData({ workbook, sheetName });
        setRecords(jsonData.slice(1).map(row => ({
          Data: row[0] || '',
          Hora: row[1] || '',
          Técnico: row[2] || '',
          'Item Verificado': row[3] || '',
          Status: row[4] || '',
          Observações: row[5] || ''
        })).filter(row => row.Data || row.Hora || row.Técnico || row['Item Verificado'] || row.Status || row.Observações));
        setError('');
        setSuccessMessage('');
        setShowDashboardPrompt(true);
      } catch (err) {
        setError('Erro ao ler o arquivo: ' + err.message);
        setSuccessMessage('');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const startChecklist = () => {
    if (!excelData) {
      setError('Por favor, selecione um arquivo antes de iniciar.');
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

    const updatedRecords = [...records, newRecord];
    setRecords(updatedRecords);
    setStatus('');
    setObservations('');
    setError('');
    setSuccessMessage('');

    if (currentItemIndex + 1 < checklistItems.length) {
      setCurrentItemIndex(currentItemIndex + 1);
    } else {
      setCurrentItemIndex(-1);
    }
  };

  const saveToFile = () => {
    if (!excelData) {
      setError('Nenhum arquivo selecionado para salvar.');
      setSuccessMessage('');
      return;
    }
    if (records.length === 0) {
      setError('Nenhum registro para salvar.');
      setSuccessMessage('');
      return;
    }

    const { workbook, sheetName } = excelData;
    const headers = ['Data', 'Hora', 'Técnico', 'Item Verificado', 'Status', 'Observações'];
    const worksheetData = [headers, ...records.map(record => [
      record.Data,
      record.Hora,
      record.Técnico,
      record['Item Verificado'],
      record.Status,
      record.Observações
    ])];

    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    worksheet['!cols'] = [
      { wch: 12 }, // Data
      { wch: 10 }, // Hora
      { wch: 20 }, // Técnico
      { wch: 30 }, // Item Verificado
      { wch: 10 }, // Status
      { wch: 40 }  // Observações
    ];

    workbook.Sheets[sheetName] = worksheet;
    if (!workbook.SheetNames.includes(sheetName)) {
      workbook.SheetNames.push(sheetName);
    }

    try {
      const wbout = XLSX.write(workbook, { bookType: fileType, type: 'array' });
      const blob = new Blob([wbout], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName; // Usa o nome do arquivo original
      a.click();
      URL.revokeObjectURL(url);
      setSuccessMessage(`Arquivo "${fileName}" atualizado e salvo com sucesso!`);
      setError('');
    } catch (err) {
      setError('Erro ao salvar o arquivo: ' + err.message);
      setSuccessMessage('');
    }
  };

  const prepareChartData = (filteredRecords) => {
    const statusCounts = checklistItems.map(item => {
      const counts = { OK: 0, ALERTA: 0, FALHA: 0 };
      filteredRecords
        .filter(record => record['Item Verificado'] === item)
        .forEach(record => {
          counts[record.Status] = (counts[record.Status] || 0) + 1;
        });
      return { item, counts };
    });

    return {
      labels: checklistItems,
      datasets: [
        {
          label: 'OK',
          data: statusCounts.map(sc => sc.counts.OK),
          backgroundColor: 'rgba(75, 192, 192, 0.6)',
        },
        {
          label: 'ALERTA',
          data: statusCounts.map(sc => sc.counts.ALERTA),
          backgroundColor: 'rgba(255, 206, 86, 0.6)',
        },
        {
          label: 'FALHA',
          data: statusCounts.map(sc => sc.counts.FALHA),
          backgroundColor: 'rgba(255, 99, 132, 0.6)',
        },
      ],
    };
  };

  const filteredRecords = records.filter(record => {
    return (
      (!filterData || record.Data.includes(filterData)) &&
      (!filterTechnician || record.Técnico.toLowerCase().includes(filterTechnician.toLowerCase())) &&
      (!filterStatus || record.Status === filterStatus)
    );
  });

  useEffect(() => {
    if (showDashboard && filteredRecords.length > 0 && chartRef.current) {
      const ctx = chartRef.current.getContext('2d');
      const chart = new Chart(ctx, {
        type: 'bar',
        data: prepareChartData(filteredRecords),
        options: {
          responsive: true,
          plugins: {
            legend: { position: 'top' },
            title: { display: true, text: 'Distribuição de Status por Item Verificado' },
          },
          scales: {
            y: { beginAtZero: true, title: { display: true, text: 'Contagem' } },
            x: { title: { display: true, text: 'Itens Verificados' } },
          },
        },
      });

      return () => chart.destroy();
    }
  }, [showDashboard, filteredRecords]);

  return (
    <div className="max-w-4xl mx-auto bg-white p-8 rounded-lg shadow-lg">
      <h1 className="text-2xl font-bold mb-6 text-center text-gray-800">
        Checklist do Datacenter
      </h1>

      {showDashboardPrompt && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <p className="text-lg mb-4">Deseja visualizar a dashboard com os dados do arquivo?</p>
            <div className="flex justify-between">
              <button
                onClick={() => {
                  setShowDashboard(true);
                  setShowDashboardPrompt(false);
                }}
                className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition"
              >
                Sim, visualizar
              </button>
              <button
                onClick={() => setShowDashboardPrompt(false)}
                className="bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 transition"
              >
                Não, continuar
              </button>
            </div>
          </div>
        </div>
      )}

      {showDashboard ? (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Dashboard de Registros</h2>
            <button
              onClick={() => setShowDashboard(false)}
              className="bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 transition"
            >
              Voltar
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Filtrar por Data</label>
              <input
                type="text"
                value={filterData}
                onChange={(e) => setFilterData(e.target.value)}
                className="mt-1 block w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ex: 14/07/2025"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Filtrar por Técnico</label>
              <input
                type="text"
                value={filterTechnician}
                onChange={(e) => setFilterTechnician(e.target.value)}
                className="mt-1 block w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Nome do técnico"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Filtrar por Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="mt-1 block w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todos</option>
                <option value="OK">OK</option>
                <option value="ALERTA">Alerta</option>
                <option value="FALHA">Falha</option>
              </select>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-md font-medium mb-4">Distribuição de Status por Item</h3>
            <canvas ref={chartRef} />
          </div>

          <div>
            <h3 className="text-md font-medium mb-4">Registros Detalhados</h3>
            {filteredRecords.length === 0 ? (
              <p className="text-gray-600">Nenhum registro corresponde aos filtros aplicados.</p>
            ) : (
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-200">
                    <th className="border p-2">Data</th>
                    <th className="border p-2">Hora</th>
                    <th className="border p-2">Técnico</th>
                    <th className="border p-2">Item</th>
                    <th className="border p-2">Status</th>
                    <th className="border p-2">Observações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.map((record, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="border p-2">{record.Data}</td>
                      <td className="border p-2">{record.Hora}</td>
                      <td className="border p-2">{record.Técnico}</td>
                      <td className="border p-2">{record['Item Verificado']}</td>
                      <td className="border p-2">{record.Status}</td>
                      <td className="border p-2">{record.Observações}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      ) : currentItemIndex === -1 ? (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Selecionar Arquivo (Excel ou LibreOffice)
            </label>
            <input
              type="file"
              accept=".xlsx,.xls,.ods"
              onChange={handleFileUpload}
              ref={fileInputRef}
              className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
            />
            {fileName && <p className="text-sm text-gray-600">Arquivo selecionado: {fileName}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Nome do Técnico
            </label>
            <input
              type="text"
              value={technician}
              onChange={(e) => setTechnician(e.target.value)}
              className="mt-1 block w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Digite seu nome"
            />
          </div>
          {error && <p className="text-red-500">{error}</p>}
          {successMessage && <p className="text-green-500">{successMessage}</p>}
          <button
            onClick={startChecklist}
            className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition"
          >
            Iniciar Checklist
          </button>
          {records.length > 0 && (
            <button
              onClick={() => setShowDashboard(true)}
              className="w-full bg-purple-600 text-white py-2 rounded-md hover:bg-purple-700 transition"
            >
              Visualizar Dashboard
            </button>
          )}
          {records.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mt-6">Registros</h2>
              <table className="w-full mt-4 border-collapse">
                <thead>
                  <tr className="bg-gray-200">
                    <th className="border p-2">Data</th>
                    <th className="border p-2">Hora</th>
                    <th className="border p-2">Técnico</th>
                    <th className="border p-2">Item</th>
                    <th className="border p-2">Status</th>
                    <th className="border p-2">Observações</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((record, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="border p-2">{record.Data}</td>
                      <td className="border p-2">{record.Hora}</td>
                      <td className="border p-2">{record.Técnico}</td>
                      <td className="border p-2">{record['Item Verificado']}</td>
                      <td className="border p-2">{record.Status}</td>
                      <td className="border p-2">{record.Observações}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button
                onClick={saveToFile}
                className="mt-4 w-full bg-green-600 text-white py-2 rounded-md hover:bg-green-700 transition"
              >
                Salvar no Arquivo
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">
            Item: {checklistItems[currentItemIndex]}
          </h2>
          {checklistItems[currentItemIndex] === "Temperatura e Umidade (Sensores)" && (
            <div className="bg-yellow-100 border-l-4 border-yellow-500 p-4 mb-4">
              <p className="text-sm text-gray-800">
                <strong>Temperatura:</strong>
                <br />
                • Faixa ideal: 18°C a 25°C
                <br />
                <strong>Umidade:</strong>
                <br />
                • Faixa ideal: 45% a 55%
              </p>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="mt-1 block w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Selecione</option>
              <option value="OK">OK</option>
              <option value="ALERTA">Alerta</option>
              <option value="FALHA">Falha</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Observações
            </label>
            <textarea
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              className="mt-1 block w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Digite observações (opcional)"
              rows="4"
            />
          </div>
          {error && <p className="text-red-500">{error}</p>}
          {successMessage && <p className="text-green-500">{successMessage}</p>}
          <button
            onClick={handleSubmit}
            className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition"
          >
            {currentItemIndex + 1 === checklistItems.length
              ? 'Finalizar Checklist'
              : 'Próximo Item'}
          </button>
        </div>
      )}
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);