export interface Protocol {
  platformId: number;
  platformName: string;
  logo: string;
  network: string;
  platformWebSite: string;
  description?: string;
}

export const protocols: Protocol[] = [
  {
    platformId: 486,
    platformName: "SUI Staking",
    logo: "https://static.coinall.ltd/cdn/web3/protocol/logo/suistaking-none.jpg/type=jpg_350_0?u=1744564533560",
    network: "SUI",
    platformWebSite: "https://sui.io/",
    description: "Официальный стейкинг SUI"
  },
  {
    platformId: 550,
    platformName: "Scallop",
    logo: "https://static.coinall.ltd/cdn/web3/protocol/logo/scallop-none.png/type=png_350_0?u=1747949717895",
    network: "SUI",
    platformWebSite: "https://app.scallop.io/swap",
    description: "Децентрализованная биржа и протокол кредитования"
  },
  {
    platformId: 10551,
    platformName: "NAVI Protocol",
    logo: "https://static.coinall.ltd/cdn/web3/protocol/logo/naviprotocol-none.jpg/type=jpg_350_0?u=1747931647736",
    network: "SUI",
    platformWebSite: "https://www.naviprotocol.io/",
    description: "Протокол кредитования и займов"
  },
  {
    platformId: 11010,
    platformName: "Aftermath Finance",
    logo: "https://static.coinall.ltd/cdn/web3/protocol/logo/aftermathfinance-none.png/type=png_350_0?u=1747949256203",
    network: "SUI",
    platformWebSite: "https://aftermath.finance",
    description: "Децентрализованная биржа и протокол управления активами"
  },
  {
    platformId: 11012,
    platformName: "Volo",
    logo: "https://static.coinall.ltd/cdn/web3/protocol/logo/volo-none.png/type=png_350_0?u=1747932264550",
    network: "SUI",
    platformWebSite: "https://www.volo.fi/",
    description: "Протокол управления ликвидностью"
  },
  {
    platformId: 11020,
    platformName: "Turbos",
    logo: "https://static.coinall.ltd/cdn/web3/protocol/logo/turbos-none.png/type=png_350_0?u=1747933908855",
    network: "SUI",
    platformWebSite: "https://app.turbos.finance/",
    description: "Децентрализованная биржа с концентрированной ликвидностью"
  },
  {
    platformId: 11148,
    platformName: "Haedal Protocol",
    logo: "https://static.coinall.ltd/cdn/web3/protocol/logo/haedalprotocol-none.jpg/type=jpg_350_0?u=1747932006405",
    network: "SUI",
    platformWebSite: "https://haedal.xyz",
    description: "Протокол стейкинга и управления активами"
  },
  {
    platformId: 11591,
    platformName: "Suilend",
    logo: "https://static.coinall.ltd/cdn/web3/protocol/logo/suilend-none.png/type=png_350_0?u=1747931561593",
    network: "SUI",
    platformWebSite: "https://www.suilend.fi",
    description: "Протокол кредитования и займов"
  }
];

// Хелперы для работы с протоколами
export const getProtocolByName = (name: string): Protocol | undefined => {
  return protocols.find(p => p.platformName === name);
};

export const getProtocolById = (id: number): Protocol | undefined => {
  return protocols.find(p => p.platformId === id);
};

export const getProtocolLogo = (name: string): string => {
  return getProtocolByName(name)?.logo || '';
};

export const getProtocolWebsite = (name: string): string => {
  return getProtocolByName(name)?.platformWebSite || '';
};

export const getProtocolDescription = (name: string): string => {
  return getProtocolByName(name)?.description || '';
}; 