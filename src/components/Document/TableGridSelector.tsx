import { useState } from "react";

export const TableGridSelector = ({ className, onSelect }: { className?: string; onSelect: (rows: number, cols: number) => void }) => {
    const [hoverRows, setHoverRows] = useState(0);
    const [hoverCols, setHoverCols] = useState(0);

    const maxRows = 6;
    const maxCols = 8;

    const handleCellHover = (row: number, col: number) => {
        setHoverRows(row);
        setHoverCols(col);
    };

    const handleCellClick = (row: number, col: number) => {
        onSelect(row, col);
    };

    return (
        <div className={`flex flex-col items-center space-y-3 ${className}`}>
            {/* Grid */}
            <div
                className="grid gap-1 justify-center"
                style={{
                    gridTemplateColumns: `repeat(${maxCols}, 22px)`,
                    width: 'fit-content'
                }}
                onMouseLeave={() => {
                    setHoverRows(0);
                    setHoverCols(0);
                }}
            >
                {Array.from({ length: maxRows * maxCols }, (_, index) => {
                    const row = Math.floor(index / maxCols) + 1;
                    const col = (index % maxCols) + 1;
                    const isSelected = row <= hoverRows && col <= hoverCols;

                    return (
                        <div
                            key={index}
                            className={`
                                w-5 h-5 border border-gray-300 cursor-pointer transition-colors rounded-sm
                                ${isSelected ? 'bg-blue-500 border-blue-500' : 'bg-white hover:bg-blue-100'}
                            `}
                            onMouseEnter={() => handleCellHover(row, col)}
                            onClick={() => handleCellClick(row, col)}
                        />
                    );
                })}
            </div>

            {/* Label */}
            <div className="text-center text-sm text-gray-600">
                {hoverRows} x {hoverCols}
            </div>
        </div>
    );
};