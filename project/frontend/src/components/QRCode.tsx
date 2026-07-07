/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';

interface QRCodeProps {
  value: string;
  size?: number;
  restaurantLogo?: string;
  label?: string;
}

export default function QRCode({ value, size = 160, restaurantLogo = '🍔', label }: QRCodeProps) {
  // Deterministically generate a visual QR grid based on the hash of the target value.
  // This makes the QR code render a unique, realistic, and stable pattern.
  const grid = useMemo(() => {
    const size = 21; // Standard Version 1 QR code is 21x21 modules
    const matrix: boolean[][] = Array(size).fill(null).map(() => Array(size).fill(false));

    // Simple deterministic hash function of string
    const getHashNum = (str: string, offset: number) => {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        hash = (hash << 5) - hash + str.charCodeAt(i);
        hash |= 0; // Convert to 32bit integer
      }
      return Math.abs(hash + offset);
    };

    // Draw position finder patterns (top-left, top-right, bottom-left)
    const drawFinderPattern = (rowStart: number, colStart: number) => {
      for (let r = 0; r < 7; r++) {
        for (let c = 0; c < 7; c++) {
          const isBorder = r === 0 || r === 6 || c === 0 || c === 6;
          const isCenter = r >= 2 && r <= 4 && c >= 2 && c <= 4;
          if (rowStart + r < size && colStart + c < size) {
            matrix[rowStart + r][colStart + c] = isBorder || isCenter;
          }
        }
      }
    };

    drawFinderPattern(0, 0); // Top-left
    drawFinderPattern(0, size - 7); // Top-right
    drawFinderPattern(size - 7, 0); // Bottom-left

    // Draw timing patterns
    for (let i = 8; i < size - 8; i++) {
      matrix[6][i] = i % 2 === 0;
      matrix[i][6] = i % 2 === 0;
    }

    // Populate other cells deterministically based on string value
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        // Skip position patterns
        const isFinder =
          (r < 8 && c < 8) || // Top-left
          (r < 8 && c > size - 9) || // Top-right
          (r > size - 9 && c < 8); // Bottom-left

        const isTiming = r === 6 || c === 6;

        // Skip middle logo area
        const isCenter = r >= 9 && r <= 11 && c >= 9 && c <= 11;

        if (!isFinder && !isTiming && !isCenter) {
          const seed = getHashNum(value, r * size + c);
          matrix[r][c] = seed % 3 === 0 || seed % 7 === 0;
        }
      }
    }

    return matrix;
  }, [value]);

  const moduleSize = size / 21;

  return (
    <div className="flex flex-col items-center justify-center p-4 bg-white rounded-2xl border border-gray-100 shadow-sm max-w-fit">
      <div className="relative bg-white p-3 rounded-lg flex items-center justify-center">
        {/* Decorative corner borders */}
        <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-emerald-500 rounded-tl-md"></div>
        <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-emerald-500 rounded-tr-md"></div>
        <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-emerald-500 rounded-bl-md"></div>
        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-emerald-500 rounded-br-md"></div>

        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {/* Background */}
          <rect width={size} height={size} fill="#ffffff" />

          {/* QR Paths */}
          {grid.map((rowArr, r) =>
            rowArr.map((active, c) => {
              if (!active) return null;

              // Use custom colors for modern premium Look:
              // Finders in Emerald-800, modules in Charcoal-900
              const isFinder =
                (r < 7 && c < 7) || // Top-left
                (r < 7 && c > 13) || // Top-right
                (r > 13 && c < 7); // Bottom-left

              const fillColor = isFinder ? '#047857' : '#1f2937';

              return (
                <rect
                  key={`${r}-${c}`}
                  x={c * moduleSize}
                  y={r * moduleSize}
                  width={moduleSize - 0.2}
                  height={moduleSize - 0.2}
                  rx={isFinder ? moduleSize / 4 : moduleSize / 6}
                  fill={fillColor}
                />
              );
            })
          )}

          {/* Core Branding overlay in center */}
          <g transform={`translate(${size / 2 - 14}, ${size / 2 - 14})`}>
            <rect width="28" height="28" rx="8" fill="#ffffff" stroke="#10b981" strokeWidth="2" />
            <text x="14" y="20" fontSize="15" textAnchor="middle" style={{ userSelect: 'none' }}>
              {restaurantLogo}
            </text>
          </g>
        </svg>
      </div>

      {label && (
        <div className="mt-3 text-center">
          <p className="text-xs font-mono font-semibold text-gray-700 tracking-wider bg-gray-50 px-3 py-1 rounded-full border border-gray-100">
            {label}
          </p>
          <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-widest font-mono">
            Scan to order • مسح للطلب مباشر
          </p>
        </div>
      )}
    </div>
  );
}
