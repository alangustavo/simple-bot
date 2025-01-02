import axios from 'axios';

interface SymbolInfo {
    priceScale: number;
    quantityScale: number;
    minQty: number;
    maxQty: number;
    stepSize: number;
    orderTypes: string[];
    lastUpdated: number;
}

class BinanceCryptoInfo {
    private static instance: BinanceCryptoInfo;
    private symbolInfoMap: Map<string, SymbolInfo> = new Map();
    private cacheDuration = 4 * 60 * 60 * 1000; // 4 hours in milliseconds

    private constructor() { }

    public static getInstance(): BinanceCryptoInfo {
        if (!BinanceCryptoInfo.instance) {
            BinanceCryptoInfo.instance = new BinanceCryptoInfo();
            console.log('BinanceCryptoInfo instance created');
        }
        return BinanceCryptoInfo.instance;
    }

    public async getSymbolInfo(symbol: string): Promise<SymbolInfo> {
        const now = Date.now();
        const cachedInfo = this.symbolInfoMap.get(symbol);

        if (cachedInfo && (now - cachedInfo.lastUpdated < this.cacheDuration)) {
            return cachedInfo;
        }

        const symbolInfo = await this.fetchSymbolInfo(symbol);
        this.symbolInfoMap.set(symbol, { ...symbolInfo, lastUpdated: now });
        return symbolInfo;
    }

    private async fetchSymbolInfo(symbol: string): Promise<SymbolInfo> {
        const response = await axios.get(`https://api.binance.com/api/v3/exchangeInfo?symbol=${symbol}`);
        const symbolData = response.data.symbols[0];

        return {
            priceScale: symbolData.quotePrecision,
            quantityScale: symbolData.baseAssetPrecision,
            minQty: Number.parseFloat(symbolData.filters.find((f: { filterType: string; minQty: string; maxQty: string; stepSize: string; }) => f.filterType === 'LOT_SIZE').minQty),
            maxQty: Number.parseFloat(symbolData.filters.find((f: { filterType: string; minQty: string; maxQty: string; stepSize: string; }) => f.filterType === 'LOT_SIZE').maxQty),
            stepSize: Number.parseFloat(symbolData.filters.find((f: { filterType: string; stepSize: string; }) => f.filterType === 'LOT_SIZE').stepSize),
            orderTypes: symbolData.orderTypes,
            lastUpdated: Date.now()
        };
    }

}

export default BinanceCryptoInfo;
export type { SymbolInfo };
