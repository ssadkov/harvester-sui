"use client";

import { GuageIcon, LightningIcon, LockIcon } from "./icons";
import { motion } from "framer-motion";
import { scaleLinear } from "d3-scale";

// Временная заглушка, чтобы не было ошибок импорта
export const HubView = () => {
  return (
    <div className="flex flex-row gap-2 md:max-w-[452px] max-w-[calc(100dvw-80px)] w-full pb-6">
      <div className="bg-zinc-100 dark:bg-zinc-800 p-2 rounded-md flex flex-row gap-3 items-center">
        <div className="p-2 bg-blue-500 text-blue-50 dark:bg-blue-300 dark:text-blue-800 rounded-md">
          <GuageIcon />
        </div>
        <div>
          <div className="text-xs">Climate</div>
          <div className="text-xs text-zinc-500 dark:text-zinc-400">demo</div>
        </div>
      </div>
      <div className="bg-zinc-100 dark:bg-zinc-800 p-2 rounded-md flex flex-row gap-3 items-center flex-shrink-0">
        <div className={`relative p-2 text-zinc-50 size-8 dark:bg-zinc-200 dark:text-amber-900 rounded-md bg-zinc-300`}>
          <div className="size-8 absolute z-20">
            <LightningIcon />
          </div>
        </div>
        <div>
          <div className="text-xs">Lights</div>
          <div className="text-xs text-zinc-500 dark:text-zinc-400">demo</div>
        </div>
      </div>
      <div className="bg-zinc-100 dark:bg-zinc-800 p-2 rounded-md flex flex-row gap-3 items-center">
        <div className="p-2 bg-green-600 text-green-100 dark:bg-green-200 dark:text-green-900 rounded-md">
          <LockIcon />
        </div>
        <div>
          <div className="text-xs">Security</div>
          <div className="text-xs text-zinc-500 dark:text-zinc-400">demo</div>
        </div>
      </div>
    </div>
  );
};
