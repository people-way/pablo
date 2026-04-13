declare module "stockfish" {
  type StockfishInstance = {
    listener?: (line: string) => void;
    sendCommand: (command: string) => void;
  };

  export default function initStockfish(
    enginePath?: string,
  ): Promise<StockfishInstance> | StockfishInstance;
}
