import XTermComponent from "./XtermComponent";

const TerminalComponent = () => {
  return (
    <div className="font-mono h-4/5 w-5/8 bg-[#0D1117] flex flex-col">
      <div id="terminal-top" className="h-[40px] w-full bg-[#F5F5F5] flex items-center justify-center px-2 relative">
        <div className="flex items-center absolute left-2">
          <div className="h-3 w-3 bg-red-500 rounded-full mx-1"></div>
          <div className="h-3 w-3 bg-yellow-500 rounded-full mx-1"></div>
          <div className="h-3 w-3 bg-green-500 rounded-full mx-1"></div>
        </div>
        <div>~vishal.varshney</div>
      </div>
      <div className="w-full flex-1 overflow-y-auto">
      <XTermComponent />
      </div>
    </div>
  );
};

export default TerminalComponent;
