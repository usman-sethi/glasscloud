import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { FileItem } from '../types';

interface SelectionContextType {
  selectedFiles: Set<string>;
  lastSelectedId: string | null;
  isSelectionMode: boolean; // For mobile checkbox mode
  toggleSelectionMode: () => void;
  selectFile: (fileId: string, multi: boolean, shift: boolean, currentFiles: FileItem[]) => void;
  selectAll: (files: FileItem[]) => void;
  clearSelection: () => void;
  setSelection: (ids: string[]) => void;
  toggleFile: (fileId: string) => void;
}

const SelectionContext = createContext<SelectionContextType | undefined>(undefined);

export function SelectionProvider({ children }: { children: React.ReactNode }) {
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  const toggleSelectionMode = useCallback(() => {
    setIsSelectionMode(prev => !prev);
    if (isSelectionMode) {
      setSelectedFiles(new Set());
      setLastSelectedId(null);
    }
  }, [isSelectionMode]);

  const selectFile = useCallback((fileId: string, multi: boolean, shift: boolean, currentFiles: FileItem[]) => {
    setSelectedFiles(prev => {
      const newSet = new Set(prev);
      
      if (shift && lastSelectedId) {
        const lastIdx = currentFiles.findIndex(f => f.id === lastSelectedId);
        const currIdx = currentFiles.findIndex(f => f.id === fileId);
        
        if (lastIdx !== -1 && currIdx !== -1) {
          const start = Math.min(lastIdx, currIdx);
          const end = Math.max(lastIdx, currIdx);
          
          if (!multi) newSet.clear();
          
          for (let i = start; i <= end; i++) {
            newSet.add(currentFiles[i].id);
          }
        }
      } else if (multi || isSelectionMode) {
        if (newSet.has(fileId)) {
          newSet.delete(fileId);
        } else {
          newSet.add(fileId);
        }
      } else {
        newSet.clear();
        newSet.add(fileId);
      }
      
      return newSet;
    });
    setLastSelectedId(fileId);
  }, [lastSelectedId, isSelectionMode]);

  const selectAll = useCallback((files: FileItem[]) => {
    setSelectedFiles(new Set(files.map(f => f.id)));
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedFiles(new Set());
    setLastSelectedId(null);
  }, []);

  const setSelection = useCallback((ids: string[]) => {
    setSelectedFiles(new Set(ids));
  }, []);

  const toggleFile = useCallback((fileId: string) => {
    setSelectedFiles(prev => {
      const newSet = new Set(prev);
      if (newSet.has(fileId)) {
        newSet.delete(fileId);
      } else {
        newSet.add(fileId);
      }
      return newSet;
    });
    setLastSelectedId(fileId);
  }, []);

  const value = useMemo(() => ({
    selectedFiles,
    lastSelectedId,
    isSelectionMode,
    toggleSelectionMode,
    selectFile,
    selectAll,
    clearSelection,
    setSelection,
    toggleFile
  }), [selectedFiles, lastSelectedId, isSelectionMode, toggleSelectionMode, selectFile, selectAll, clearSelection, setSelection, toggleFile]);

  return (
    <SelectionContext.Provider value={value}>
      {children}
    </SelectionContext.Provider>
  );
}

export function useSelection() {
  const context = useContext(SelectionContext);
  if (context === undefined) {
    throw new Error('useSelection must be used within a SelectionProvider');
  }
  return context;
}
