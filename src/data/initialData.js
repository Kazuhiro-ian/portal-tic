export const initialPrinters = [
  {
    id: '1',
    ip: '192.168.1.100',
    location: 'Recepcao',
    brand: 'HP',
    model: 'LaserJet Pro M404n',
    serialNumber: 'HP2024001',
    status: 'Online',
    lastMaintenance: '2024-01-15',
  },
  {
    id: '2',
    ip: '192.168.1.101',
    location: 'Financeiro',
    brand: 'Canon',
    model: 'imageCLASS MF445dw',
    serialNumber: 'CN2024002',
    status: 'Online',
    lastMaintenance: '2024-02-20',
  },
  {
    id: '3',
    ip: '192.168.1.102',
    location: 'RH',
    brand: 'Epson',
    model: 'WorkForce Pro WF-4830',
    serialNumber: 'EP2024003',
    status: 'Offline',
    lastMaintenance: '2023-11-10',
  },
  {
    id: '4',
    ip: '192.168.1.103',
    location: 'Almoxarifado',
    brand: 'Brother',
    model: 'HL-L5200DW',
    serialNumber: 'BR2024004',
    status: 'Online',
    lastMaintenance: '2024-03-05',
  },
];

export const initialStockItems = [
  {
    id: '1',
    name: 'Cabo de Rede Cat6 5m',
    category: 'peripherals',
    subcategory: 'Cabos de Rede',
    quantity: 25,
    minQuantity: 10,
    location: 'Prateleira A1',
  },
  {
    id: '2',
    name: 'Fonte ATX 500W',
    category: 'peripherals',
    subcategory: 'Fontes',
    quantity: 3,
    minQuantity: 5,
    location: 'Prateleira B2',
  },
  {
    id: '3',
    name: 'Adaptador DisplayPort-HDMI',
    category: 'peripherals',
    subcategory: 'Adaptadores',
    quantity: 12,
    minQuantity: 5,
    location: 'Gaveta C1',
  },
  {
    id: '4',
    name: 'SSD NVMe 256GB',
    category: 'storage',
    subcategory: 'SSD',
    quantity: 8,
    minQuantity: 3,
    location: 'Prateleira D1',
  },
  {
    id: '5',
    name: 'Memoria RAM DDR4 8GB',
    category: 'storage',
    subcategory: 'RAM Desktop',
    quantity: 2,
    minQuantity: 5,
    location: 'Prateleira D2',
  },
  {
    id: '6',
    name: 'Memoria RAM DDR4 16GB',
    category: 'storage',
    subcategory: 'RAM Desktop',
    quantity: 4,
    minQuantity: 3,
    location: 'Prateleira D2',
  },
  {
    id: '7',
    name: 'Memoria SODIMM DDR4 8GB',
    category: 'storage',
    subcategory: 'RAM Notebook',
    quantity: 1,
    minQuantity: 3,
    location: 'Prateleira D3',
  },
  {
    id: '8',
    name: 'Toner HP 26A Preto',
    category: 'consumables',
    subcategory: 'Toner HP',
    quantity: 4,
    minQuantity: 2,
    location: 'Armario E1',
  },
  {
    id: '9',
    name: 'Toner Canon 054 Preto',
    category: 'consumables',
    subcategory: 'Toner Canon',
    quantity: 0,
    minQuantity: 2,
    location: 'Armario E2',
  },
  {
    id: '10',
    name: 'Ribbon Zebra Wax 110x74',
    category: 'consumables',
    subcategory: 'Ribbons Zebra',
    quantity: 30,
    minQuantity: 5,
    location: 'Armario F1',
  },
  {
    id: '11',
    name: 'Etiquetas Zebra 100x50',
    category: 'consumables',
    subcategory: 'Etiquetas',
    quantity: 60,
    minQuantity: 10,
    location: 'Armario F2',
  },
];

export const initialEmployees = [
  {
    id: '1',
    name: 'Carlos Silva',
    role: 'Analista de Infraestrutura',
    shift: '08:00 - 17:00',
    isOnCall: false,
    workingDays: ['Segunda', 'Terca', 'Quarta', 'Quinta', 'Sexta'],
  },
  {
    id: '2',
    name: 'Maria Santos',
    role: 'Tecnica de Suporte',
    shift: '08:00 - 17:00',
    isOnCall: true,
    workingDays: ['Segunda', 'Terca', 'Quarta', 'Quinta', 'Sexta', 'Sabado'],
  },
  {
    id: '3',
    name: 'Pedro Oliveira',
    role: 'Analista de Redes',
    shift: '10:00 - 19:00',
    isOnCall: false,
    workingDays: ['Segunda', 'Terca', 'Quarta', 'Quinta', 'Sexta'],
  },
  {
    id: '4',
    name: 'Ana Costa',
    role: 'Coordenadora de TI',
    shift: '08:00 - 17:00',
    isOnCall: false,
    workingDays: ['Segunda', 'Terca', 'Quarta', 'Quinta', 'Sexta'],
  },
];

export const initialArticles = [
  {
    id: '1',
    title: 'Configuracao de VPN Corporativa',
    category: 'networks',
    content: `1. Acesse o portal de VPN em vpn.empresa.com.br\n2. Faca login com suas credenciais corporativas\n3. Baixe o cliente OpenVPN Connect\n4. Importe o arquivo .ovpn enviado pelo time de TI\n5. Conecte-se utilizando suas credenciais\n\nEm caso de problemas, verifique:\n- Conexao com internet\n- Firewall corporativo\n- Certificado de seguranca`,
    author: 'Carlos Silva',
    createdAt: '2024-01-10',
  },
  {
    id: '2',
    title: 'Procedimento de Backup Manual',
    category: 'systems',
    content: `1. Acesse o servidor de arquivos via SMB\n2. Navegue ate a pasta do departamento\n3. Selecione os arquivos a serem backupados\n4. Copie para a pasta BACKUP_MANUAL\n5. Notifique o responsavel via ticket\n\nImportante: Sempre verifique o espaco em disco antes de iniciar.`,
    author: 'Maria Santos',
    createdAt: '2024-02-05',
  },
];

export const initialCredentials = [
  {
    id: '1',
    name: 'Switch Core andar 1',
    username: 'admin',
    password: 'C0r3Sw1tch@2024',
    notes: 'IP: 192.168.0.1 - Switch principal',
  },
  {
    id: '2',
    name: 'Roteador Edge',
    username: 'admin',
    password: 'Edg3R0ut3r#!',
    notes: 'IP: 10.0.0.1 - Roteador de borda',
  },
  {
    id: '3',
    name: 'NAS Backup',
    username: 'backup_user',
    password: 'B@ckup2024Sec',
    notes: 'IP: 192.168.0.100 - Storage de backup',
  },
];

export const initialLinks = [
  {
    id: '1',
    name: 'Portal Azure',
    url: 'https://portal.azure.com',
    category: 'cloud',
    tags: ['Microsoft', 'Cloud', 'Azure'],
  },
  {
    id: '2',
    name: 'AWS Console',
    url: 'https://console.aws.amazon.com',
    category: 'cloud',
    tags: ['Amazon', 'Cloud', 'AWS'],
  },
  {
    id: '3',
    name: 'GitHub Enterprise',
    url: 'https://github.com/enterprise',
    category: 'cloud',
    tags: ['Git', 'Repositorio'],
  },
  {
    id: '4',
    name: 'GLPI - Gestao de TI',
    url: 'https://glpi.empresa.local',
    category: 'internal',
    tags: ['Helpdesk', 'Tickets'],
  },
  {
    id: '5',
    name: 'Zabbix Monitoramento',
    url: 'https://zabbix.empresa.local',
    category: 'infrastructure',
    tags: ['Monitoramento', 'Infra'],
  },
  {
    id: '6',
    name: 'Portaria Digital',
    url: 'https://portaria.empresa.local',
    category: 'internal',
    tags: ['Acesso', 'Visitantes'],
  },
  {
    id: '7',
    name: 'Painel de Rede',
    url: 'https://network.empresa.local',
    category: 'infrastructure',
    tags: ['Redes', 'Switches'],
  },
];

export const initialNotices = [
  {
    id: '1',
    message: 'Sistema de ERP em manutencao das 22h as 06h',
    author: 'Carlos Silva',
    createdAt: '2024-03-01T08:00:00',
    priority: 'high',
  },
  {
    id: '2',
    message: 'Novo procedimento para solicitacao de equipamentos - conferir Base de Conhecimento',
    author: 'Ana Costa',
    createdAt: '2024-03-01T10:30:00',
    priority: 'medium',
  },
];

export const initialBranches = [
  {
    id: 'b1',
    branchNumber: '001',
    name: 'Filial Centro',
    cnpj: '04.252.011/0001-10',
    address: 'Av. Eduardo Ribeiro, 520 - Centro, Manaus/AM',
  },
  {
    id: 'b2',
    branchNumber: '002',
    name: 'Filial Zona Norte',
    cnpj: '04.252.011/0002-01',
    address: 'Av. Noel Nutels, 1150 - Cidade Nova, Manaus/AM',
  },
  {
    id: 'b3',
    branchNumber: '003',
    name: 'Filial Leste',
    cnpj: '04.252.011/0003-81',
    address: 'Rua Itacoatiara, 400 - Jorge Teixeira, Manaus/AM',
  },
  {
    id: 'b4',
    branchNumber: '004',
    name: 'Filial Zona Sul',
    cnpj: '04.252.011/0004-62',
    address: 'Av. Autaz Mirim, 7000 - Tancredo Neves, Manaus/AM',
  },
];

export const initialBranchQuotas = [
  { id: '1', branchId: 'b1', defaultLabelQty: 5, defaultRibbonQty: 2, dispatchDay: 1 },
  { id: '2', branchId: 'b2', defaultLabelQty: 3, defaultRibbonQty: 1, dispatchDay: 5 },
  { id: '3', branchId: 'b3', defaultLabelQty: 4, defaultRibbonQty: 2, dispatchDay: 15 },
  { id: '4', branchId: 'b4', defaultLabelQty: 6, defaultRibbonQty: 3, dispatchDay: 20 },
];

export const initialZebraDistributions = [
  { id: '1', branchId: 'b1', labelQuantity: 5, ribbonQuantity: 2, date: '2026-05-01' },
  { id: '2', branchId: 'b2', labelQuantity: 3, ribbonQuantity: 1, date: '2026-05-05' },
  { id: '3', branchId: 'b3', labelQuantity: 4, ribbonQuantity: 2, date: '2026-05-15' },
  { id: '4', branchId: 'b4', labelQuantity: 6, ribbonQuantity: 3, date: '2026-05-20' },
  { id: '5', branchId: 'b1', labelQuantity: 5, ribbonQuantity: 2, date: '2026-04-01' },
  { id: '6', branchId: 'b2', labelQuantity: 3, ribbonQuantity: 1, date: '2026-04-05' },
];

export function initializeData() {
  const keys = [
    { key: 'ithub_printers', data: initialPrinters },
    { key: 'ithub_stock', data: initialStockItems },
    { key: 'ithub_employees', data: initialEmployees },
    { key: 'ithub_articles', data: initialArticles },
    { key: 'ithub_credentials', data: initialCredentials },
    { key: 'ithub_links', data: initialLinks },
    { key: 'ithub_notices', data: initialNotices },
    { key: 'ithub_branches', data: initialBranches },
    { key: 'ithub_branch_quotas', data: initialBranchQuotas },
    { key: 'ithub_zebra_distributions', data: initialZebraDistributions },
  ];

  keys.forEach(({ key, data }) => {
    if (!localStorage.getItem(key)) {
      localStorage.setItem(key, JSON.stringify(data));
    }
  });
}
