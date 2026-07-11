import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(__dirname, '../../data');

export const readJSONFile = (fileName: string): any[] => {
  try {
    const filePath = path.join(DATA_DIR, fileName);
    
    // Создаем директорию если не существует
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    
    // Создаем файл если не существует
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify([]));
      return [];
    }
    
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`❌ Ошибка чтения файла ${fileName}:`, error);
    return [];
  }
};

export const writeJSONFile = (fileName: string, data: any[]): boolean => {
  try {
    const filePath = path.join(DATA_DIR, fileName);
    
    // Создаем директорию если не существует
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error(`❌ Ошибка записи файла ${fileName}:`, error);
    return false;
  }
};

export const generateId = (): string => {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
};