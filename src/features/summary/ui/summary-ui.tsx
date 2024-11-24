"use client";

import { cn } from "@/shared/utils/lib/cn";
import { Button, Input, Spin, message } from "antd";
import { useState, useEffect } from "react";
import { Upload } from "lucide-react";
import { useSocketContext } from '@/shared/providers/socket-provider';
import { SummaryApi } from "../api/summary-api";
import { useTranslations } from "@/shared/hooks/use-translations";
import { isValidFileType, MAX_FILE_SIZE } from "@/shared/utils/file-validator";
import type { FileUploadEvent, SummarySocketResponse, SummaryPositionSocketResponse, SummaryErrorSocketResponse, SupportedFileTypes } from "../types";
import ReactMarkdown from 'react-markdown';

const ACCEPTED_FILE_TYPES: SupportedFileTypes[] = ['.txt', '.doc', '.docx', '.pdf'];

export const Summary = ({ className }: { className?: string }) => {
  const [summary, setSummary] = useState<string | null>(null);
  const [position, setPosition] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { on, off } = useSocketContext();
  const t = useTranslations();
  const [messageApi, contextHolder] = message.useMessage();
  const [isButtonsDisabled, setIsButtonsDisabled] = useState(false);

  useEffect(() => {
    const setupSocketListeners = () => {
      const handleSummary = (data: unknown) => {
        const summaryData = data as SummarySocketResponse;
        setSummary(summaryData.summary);
        setIsLoading(false);
        setPosition(null);
        setIsButtonsDisabled(false);
      };

      const handlePosition = (data: unknown) => {
        const positionData = data as SummaryPositionSocketResponse;
        setPosition(parseInt(positionData.position));
      };

      const handleError = (data: unknown) => {
        const errorData = data as SummaryErrorSocketResponse;
        setIsLoading(false);
        setPosition(null);
        setIsButtonsDisabled(false);
        messageApi.error(errorData.error || t.summary.error);
      };

      // Устанавливаем слушатели
      on('summary', handleSummary);
      on('position', handlePosition);
      on('error', handleError);
    };

    setupSocketListeners();

    return () => {
      off('summary');
      off('position');
      off('error');
    };
  }, [on, off, messageApi, t.summary.error]);

  const handleFileUpload = async (event: FileUploadEvent) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!isValidFileType(file.name, ACCEPTED_FILE_TYPES)) {
      messageApi.error(t.summary.invalidFileType);
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      messageApi.error(t.summary.fileTooLarge);
      return;
    }

    try {
      setIsLoading(true);
      setIsButtonsDisabled(true);
      setSummary("");
      setPosition(0);

      const reader = new FileReader();
      reader.onload = async () => {
        try {
          await SummaryApi.summarizeFile(file);
        } catch {
          setIsLoading(false);
          setIsButtonsDisabled(false);
          setPosition(null);
          messageApi.error(t.summary.error);
        }
      };
      reader.onerror = () => {
        setIsLoading(false);
        setIsButtonsDisabled(false);
        messageApi.error(t.summary.fileReadError);
      };
      reader.readAsText(file);
    } catch {
      setIsLoading(false);
      setIsButtonsDisabled(false);
      messageApi.error(t.summary.error);
    }
  };

  return (
    <>
      {contextHolder}
      <div className={cn(
        "flex flex-col items-center",
        "bg-gradient-to-b from-slate-50 to-white dark:from-dark-surface dark:to-dark-lighter",
        "w-full h-auto",
        "px-8 md:px-24 py-12",
        "transition-all duration-300",
        className
      )}>
        <div className="w-full max-w-4xl flex flex-col gap-8">
          <div className="flex justify-center">
            <Button 
              type="primary" 
              size="large"
              disabled={isButtonsDisabled}
              icon={<Upload size={18} />}
              className={cn(
                "h-auto py-4 px-6",
                "!bg-primary hover:!bg-primary-hover",
                "dark:!bg-dark-purple dark:hover:!bg-dark-purple-hover",
                "rounded-xl",
                "shadow-md hover:shadow-lg",
                "transform hover:scale-[1.02]",
                "transition-all duration-200"
              )}
              onClick={() => document.getElementById('fileInput')?.click()}
            >
              <span className="ml-2 font-medium">{t.summary.uploadFile}</span>
            </Button>
            <input
              id="fileInput"
              type="file"
              accept=".txt,.doc,.docx,.pdf"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>
          
          <div className={cn(
            "w-full rounded-xl p-8",
            "bg-white dark:bg-[#17181C]",
            "border border-slate-200 dark:border-gray-800",
            "shadow-md",
            "transition-all duration-200"
          )}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-gray-100">
                {t.summary.result}
              </h3>
            </div>
            
            <div className="text-slate-600 dark:text-gray-400 min-h-[100px]">
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <Spin />
                </div>
              ) : summary && summary.length > 0 ? (
                <div className="prose dark:prose-invert max-w-none">
                  <ReactMarkdown>{summary}</ReactMarkdown>
                </div>
              ) : (
                <div className="flex items-center justify-center h-[100px] text-slate-400 dark:text-gray-500">
                  {t.summary.enterText}
                </div>
              )}
            </div>
          </div>
        </div>
        {isLoading && (
          <div className="flex items-center justify-center">
            <span className="loader" />
            {position !== null && (
              <span className="ml-2 mt-2 text-sm text-slate-500 dark:text-gray-400">
                {t.summary.queuePosition} {position}
              </span>
            )}
          </div>
        )}
      </div>
    </>
  );
};