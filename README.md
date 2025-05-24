# Harvester AI - DeFi Dashboard for SUI

![Harvester AI Logo](https://harvester-sui.vercel.app/_next/image?url=%2Flogo.png&w=1920&q=75)

Harvester AI is a DeFi agent that simplifies interaction with SUI protocols. We built a unified dashboard where users can track and manage assets, collect rewards, and make deposits with one click. Supported protocols include Navi, Suilend, Bluefin, Scallop, Momentum, and more. We automate user actions and are implementing gasless transactions. It's the next step toward smart, seamless, and profitable DeFi.

## Key Features

- 🎯 Unified dashboard for all DeFi operations
- 🔄 Automation of routine actions
- 💰 Reward collection from all protocols
- ⚡ Fast transactions with minimal fees
- 🔒 Secure asset management

## Supported Protocols

| 🏦 Name            | 📖 Read | 💸 Supply | 💰 Withdraw  | 🎁 Rewards|
|--------------------|---------|-----------|--------------|----------|
| <img src="https://static.coinall.ltd/cdn/web3/protocol/logo/suistaking-none.jpg/type=jpg_350_0?u=1744564533560" width="20" height="20" alt="SUI" /> **SUI Staking**    |   ✅    | coming soon | coming soon | coming soon |
| <img src="https://app.scallop.io/images/logo-192.png" width="20" height="20" alt="Scallop" /> **Scallop**        |   ✅    | coming soon | coming soon | coming soon |
| <img src="https://static.coinall.ltd/cdn/web3/protocol/logo/cetus-none.png/type=png_350_0?u=1747931647736" width="20" height="20" alt="Cetus" /> **Cetus**          |   ✅    | coming soon | coming soon | coming soon |
| <img src="https://app.naviprotocol.io/favicon.png" width="20" height="20" alt="Navi" /> **Navi Protocol**  |   ✅    | coming soon | coming soon |   ✅     |
| <img src="https://static.coinall.ltd/cdn/web3/protocol/logo/aftermathfinance-none.png/type=png_350_0?u=1747949256203" width="20" height="20" alt="Aftermath" /> **Aftermath**      |   ✅    | coming soon | coming soon | coming soon |
| <img src="https://static.coinall.ltd/cdn/web3/protocol/logo/volo-none.png/type=png_350_0?u=1747932264550" width="20" height="20" alt="Volo" /> **Volo**           |   ✅    | coming soon | coming soon | coming soon |
| <img src="https://static.coinall.ltd/cdn/web3/protocol/logo/turbos-none.png/type=png_350_0?u=1747933908855" width="20" height="20" alt="Turbos" /> **Turbos Finance** |   ✅    | coming soon | coming soon | coming soon |
| <img src="https://static.coinall.ltd/cdn/web3/protocol/logo/haedalprotocol-none.jpg/type=jpg_350_0?u=1747932006405" width="20" height="20" alt="Haedal" /> **Haedal Protocol**|   ✅    | coming soon | coming soon | coming soon |
| <img src="https://harvester-sui.vercel.app/_next/image?url=https%3A%2F%2Fstatic.coinall.ltd%2Fcdn%2Fweb3%2Fprotocol%2Flogo%2Fsuilend-none.png%2Ftype%3Dpng_350_0%3Fu%3D1748017958023&w=16&q=75" width="20" height="20" alt="Suilend" /> **Suilend**        |   ✅    | coming soon | coming soon | coming soon |
| <img src="https://static.coinall.ltd/cdn/web3/protocol/logo/ika-none.png/type=png_350_0?u=1747931561593" width="20" height="20" alt="Ika" /> **Ika**            |   ✅    | coming soon | coming soon | coming soon |
| <img src="https://bluefin.io/images/square.png" width="20" height="20" alt="Bluefin" /> **Bluefin**        |   ✅    | coming soon | coming soon | coming soon |
| <img src="https://app.mmt.finance/assets/images/momentum-logo-sq.svg" width="20" height="20" alt="Momentum" /> **Momentum**       |   ✅    | coming soon | coming soon |   ✅     |

## Related Projects

- [FinKeeper App](https://finkeeper.pro/app) - A Telegram-based DeFi management application that inspired some of our features
- [Harvester Server](https://github.com/MariKhad/harvester-server) - Backend server implementation
- [Harvester API](https://harvester-server-production.up.railway.app/api#) - API documentation and testing interface

## APIs Used

- [Sui SDK](https://github.com/MystenLabs/sui/tree/main/sdk/typescript) - For SUI blockchain interaction
- [Navi Protocol API](https://docs.naviprotocol.io/) - For Navi protocol integration
- [Suilend API](https://docs.suilend.fi/) - For Suilend integration
- [Bluefin API](https://docs.bluefin.io/) - For Bluefin integration
- [Scallop API](https://docs.scallop.io/) - For Scallop integration
- [Momentum API](https://docs.momentum.xyz/) - For Momentum integration

## Installation and Setup

1. Clone the repository
```bash
git clone https://github.com/your-username/harvester-sui.git
```

2. Install dependencies
```bash
npm install
```

3. Create `.env` file based on `.env.example` and fill in the required environment variables

4. Start the project
```bash
npm run dev
```

## Future Improvements

- 🤖 AI integration for strategy optimization
- 🔄 Automatic portfolio rebalancing
- 📊 Enhanced analytics and reporting
- 🔐 Improved security and auditing
- 🌐 Support for additional protocols

## License

MIT

# Generative UI with React Server Components and Vercel AI SDK

> **Note**: Development of AI SDK RSC is currently paused. For more information, see [Migrating from AI SDK RSC](https://sdk.vercel.ai/docs/ai-sdk-rsc/migrating-to-ui#background).

This example demonstrates how to use the [Vercel AI SDK](https://sdk.vercel.ai/docs) with [Next.js](https://nextjs.org/) and the `streamUI` function to create generative user interfaces by streaming React Server Components to the client.

## Deploy your own

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fvercel-labs%2Fai-sdk-preview-rsc-genui&env=OPENAI_API_KEY&envDescription=API%20keys%20needed%20for%20application&envLink=platform.openai.com)

## How to use

Run [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app) with [npm](https://docs.npmjs.com/cli/init), [Yarn](https://yarnpkg.com/lang/en/docs/cli/create/), or [pnpm](https://pnpm.io) to bootstrap the example:

```bash
npx create-next-app --example https://github.com/vercel-labs/ai-sdk-preview-rsc-genui ai-sdk-preview-rsc-genui-example
```

```bash
yarn create next-app --example https://github.com/vercel-labs/ai-sdk-preview-rsc-genui ai-sdk-preview-rsc-genui-example
```

```bash
pnpm create next-app --example https://github.com/vercel-labs/ai-sdk-preview-rsc-genui ai-sdk-preview-rsc-genui-example
```

To run the example locally you need to:

1. Sign up for accounts with the AI providers you want to use (e.g., OpenAI, Anthropic).
2. Obtain API keys for each provider.
3. Set the required environment variables as shown in the `.env.example` file, but in a new file called `.env`.
4. `npm install` to install the required dependencies.
5. `npm run dev` to launch the development server.


## Learn More

To learn more about Vercel AI SDK or Next.js take a look at the following resources:

- [Vercel AI SDK docs](https://sdk.vercel.ai/docs)
- [Vercel AI Playground](https://play.vercel.ai)
- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.


