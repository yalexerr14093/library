import os
import sys

def collect_files(extensions, output_file="all_text.txt", start_dir="."):
    """
    Собирает содержимое файлов, игнорируя папку node_modules
    """
    
    with open(output_file, 'w', encoding='utf-8') as out_file:
        for root, dirs, files in os.walk(start_dir):
            
            # ИСКЛЮЧАЕМ node_modules из дальнейшего обхода
            if 'node_modules' in dirs:
                dirs.remove('node_modules')  # Удаляем из списка для обхода
            
            # Также исключаем любые подпапки node_modules
            dirs[:] = [d for d in dirs if 'node_modules' not in d]
            
            for file in files:
                if any(file.endswith(ext) for ext in extensions):
                    filepath = os.path.join(root, file)
                    
                    # Дополнительная проверка (на всякий случай)
                    if 'node_modules' in filepath:
                        continue  # Пропускаем файлы в node_modules
                    
                    try:
                        out_file.write(f"\n\n{'='*60}\n")
                        out_file.write(f"ФАЙЛ: {filepath}\n")
                        out_file.write(f"{'='*60}\n\n")
                        
                        with open(filepath, 'r', encoding='utf-8') as f:
                            out_file.write(f.read())
                            
                    except Exception as e:
                        out_file.write(f"ОШИБКА чтения {filepath}: {str(e)}\n")
    
    print(f"Готово! Файлы собраны в {output_file}")
    print("Папка 'node_modules' была проигнорирована")


if __name__ == "__main__":
    # Указываем нужные расширения
    extensions = ['.js', '.css', '.html', '.jsx', '.ts', '.tsx', '.vue']
    
    # Или можете добавить так (с точкой и без):
    # extensions = ['js', '.js', 'css', '.css', 'html', '.html']
    
    collect_files(extensions, "project_code.txt", ".")