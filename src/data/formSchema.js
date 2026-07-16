// Data schema derived from 客户信息登记表-SE.docx
// field types: text | textarea | checkboxGroup | radioGroup | powerSpec

export const PRODUCT_LIST = [
  { key: 'purifiedWater', label: 'Purified Water System / 纯化水系统' },
  { key: 'pureSteam', label: 'Pure Steam Generator / 纯蒸汽发生器' },
  { key: 'multiEffect', label: 'Multi-effect Water Distiller / 多效蒸馏水机' },
  { key: 'waterDistribution', label: 'Water Distribution System / 水分配系统' },
  { key: 'liquidPrep', label: 'Liquid Preparation System / 配液系统' },
  { key: 'others', label: 'Others / 其他' },
];

// Generic reusable field: power spec (Voltage / Hz / phase)
const powerSpecField = {
  key: 'powerSpec',
  label: 'Power Specification / 电源规格',
  type: 'powerSpec',
};

const certField = {
  key: 'certRequirements',
  label: 'Equipment Certification Requirements / 设备认证要求',
  type: 'text',
};

export const PRODUCT_FIELDS = {
  purifiedWater: [
    { key: 'capacity', label: 'Capacity (L/h) / 产水量', type: 'text' },
    {
      key: 'waterUsedFor',
      label: 'Water used for / 用水用途',
      type: 'checkboxGroup',
      options: ['Pharmaceutical / 制药', 'Drinking / 饮用', 'Food & Beverage / 食品饮料'],
      allowOther: true,
    },
    {
      key: 'rawWaterTestReport',
      label: 'Raw Water Test Report / 原水检测报告',
      type: 'radioGroup',
      options: ['Yes / 有', 'No / 无'],
      allowOtherDetailText: true, // extra detail text box regardless
    },
    { key: 'purifiedWaterStandard', label: 'Purified Water Standard / 纯化水标准', type: 'text' },
    powerSpecField,
    certField,
  ],
  pureSteam: [
    { key: 'capacity', label: 'Capacity (kg/h) / 产汽量', type: 'text' },
    powerSpecField,
    certField,
  ],
  multiEffect: [
    { key: 'capacity', label: 'Capacity (kg/h) / 产水量', type: 'text' },
    powerSpecField,
    certField,
  ],
  waterDistribution: [
    { key: 'quantityPOU', label: 'Quantity of Points of Use / 用水点数量', type: 'text' },
    { key: 'totalVolumePeak', label: 'Total Volume During Peak Time / 高峰期总用水量', type: 'text' },
    { key: 'highestVolumePOU', label: 'Highest Volume of POU During Peak Time / 高峰期单点最大用水量', type: 'text' },
    {
      key: 'drawings',
      label: 'Drawings / 图纸',
      type: 'checkboxGroup',
      options: ['Floor plan / 平面图', 'Construction drawings / 施工图'],
      allowOther: true,
    },
    powerSpecField,
    certField,
  ],
  liquidPrep: [
    { key: 'processFlow', label: 'Process Flow of the Preparation / 配液工艺流程', type: 'text' },
    { key: 'tankVolume', label: 'Tank Volume / 罐体容积', type: 'text' },
    { key: 'weighingRequirements', label: 'Weighing Requirements / 称重要求', type: 'text' },
    powerSpecField,
    certField,
  ],
  others: [
    {
      key: 'otherTypes',
      label: 'Type / 类型',
      type: 'checkboxGroup',
      options: ['CIP & SIP', 'Extraction / 提取', 'Concentration / 浓缩', 'Mixing Tanks / 配料罐'],
      allowOther: true,
    },
    { key: 'detailedRequirements', label: 'Detailed requirements / 详细需求', type: 'textarea' },
  ],
};

export const GMP_FIELDS = [
  {
    key: 'gmpCompliance',
    label: 'GMP Compliance / GMP 合规要求',
    type: 'checkboxGroup',
    options: ['EU GMP', 'US FDA cGMP', 'WHO GMP'],
    allowOther: true,
  },
  {
    key: 'validationRequirements',
    label: 'Validation Requirements (Pharmaceutical only) / 验证要求（仅制药）',
    type: 'checkboxGroup',
    options: ['DQ', 'FAT', 'SAT', 'IQ', 'OQ', 'PQ', 'Not required / 不需要'],
  },
  {
    key: 'materialStandard',
    label: 'Material & Sanitary Design Standard / 材质与卫生设计标准',
    type: 'checkboxGroup',
    options: ['SS316L', 'SS304', 'Electropolished / 电抛光', 'ASME BPE'],
    allowOther: true,
  },
  {
    key: 'internalSurfaceFinish',
    label: 'Internal Surface Finish Ra ≤ ___ μm / 内表面粗糙度',
    type: 'selectWithOther',
    options: ['0.4', '0.6', '0.8'],
  },
  {
    key: 'externalSurfaceFinish',
    label: 'External Surface Finish Ra ≤ ___ μm / 外表面粗糙度',
    type: 'selectWithOther',
    options: ['0.4', '0.6', '0.8'],
  },
  {
    key: 'dataTracking',
    label: 'Data Tracking & Auditing / 数据追溯与审计',
    type: 'checkboxGroup',
    options: ['Not required / 不需要', '21 CFR Part 11'],
    allowOther: true,
  },
  {
    key: 'onlineMonitoring',
    label: 'Online Monitoring Parameters / 在线监测参数',
    type: 'checkboxGroup',
    options: ['TOC', 'Conductivity / 电导率', 'Temperature / 温度', 'Pressure / 压力', 'Microbial / 微生物'],
  },
  {
    key: 'brandPreference',
    label: 'Key components brand Preference / 关键部件品牌偏好',
    type: 'radioGroup',
    options: ['International Brands / 国际品牌', 'Top Chinese Brands / 国产头部品牌'],
  },
  {
    key: 'localRegulatory',
    label: 'Local Regulatory Requirements (mainly for pharma) / 当地法规要求（主要针对制药）',
    type: 'text',
  },
  {
    key: 'budgetRange',
    label: 'Budget Range / 预算范围',
    type: 'text',
  },
];

export const COMMUNICATION_PERSONS = ['Ray', 'Alex', 'Hannah'];

export const BASIC_INFO_FIELDS = {
  event: [
    { key: 'exhibition', label: 'Exhibition / 展会名称', type: 'text', default: 'Medipharma Vietnam 2026' },
    { key: 'date', label: 'Date / 日期', type: 'date' }, // rendered as native date picker, pre-filled with today
    { key: 'boothNo', label: 'Booth No. / 展位号', type: 'text', default: 'Hall A1, B27&B28' },
    { key: 'salesRep', label: 'Sales Rep / 销售负责人', type: 'text' }, // rendered specially (dropdown from Settings)
  ],
  customer: [
    {
      key: 'namePrefix',
      label: 'Prefix / 称谓',
      type: 'selectWithOther',
      options: ['Mr.', 'Ms.', 'Mrs.', 'Dr.', 'Eng.'],
    },
    { key: 'name', label: 'Name / 姓名', type: 'text' },
    {
      key: 'position',
      label: 'Position / 职位',
      type: 'selectWithOther',
      options: ['Owner', 'Director', 'Purchasing Manager', 'Sales', 'Engineer'],
    },
    { key: 'company', label: 'Company / 公司', type: 'text' },
    { key: 'country', label: 'Country / 国家', type: 'countrySelect' },
    { key: 'telWhatsapp', label: 'Tel / WhatsApp', type: 'text' }, // rendered specially (auto dial code)
    { key: 'email', label: 'Email', type: 'text' },
    { key: 'website', label: 'Website / 网站', type: 'text' },
  ],
};
