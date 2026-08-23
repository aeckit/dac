import type { WorkspaceManager } from '../Workspace';

export interface FileManagerOptions {
  container: HTMLUListElement;
  workspace: WorkspaceManager;
  onFileSelect: (filename: string) => void;
  onInsertDetail: (filename: string) => void;
}

export class FileManagerUI {
  private options: FileManagerOptions;
  constructor(options: FileManagerOptions) {
    this.options = options;
  }

  public render() {
    const { container, workspace, onFileSelect, onInsertDetail } = this.options;
    container.innerHTML = '';
    const files = workspace.getFiles();
    
    const createDeleteButton = (filename: string) => {
      const delBtn = document.createElement('span');
      delBtn.textContent = '×';
      delBtn.style.color = '#ff6b6b';
      delBtn.style.marginLeft = '8px';
      delBtn.style.cursor = 'pointer';
      delBtn.onclick = (e) => {
        e.stopPropagation();
        workspace.deleteFile(filename);
      };
      return delBtn;
    };

    const renderSectionTitle = (title: string) => {
      const header = document.createElement('div');
      header.textContent = title;
      header.style.fontSize = '10px';
      header.style.textTransform = 'uppercase';
      header.style.color = '#94a3b8';
      header.style.padding = '12px 12px 4px 12px';
      header.style.fontWeight = 'bold';
      header.style.letterSpacing = '0.5px';
      container.appendChild(header);
    };

    const projects = Object.keys(files).filter(k => files[k].type === 'CAD::Project');
    const sheets = Object.keys(files).filter(k => files[k].type === 'CAD::SheetConfiguration');
    const titleBlocks = Object.keys(files).filter(k => files[k].type === 'CAD::TitleBlock');
    const details = Object.keys(files).filter(k => files[k].type === 'CAD::Detail');
    
    const classified = new Set([...projects, ...sheets, ...titleBlocks, ...details]);
    const others = Object.keys(files).filter(k => !classified.has(k));
    details.push(...others);

    if (projects.length > 0) {
      renderSectionTitle('Projects');
      projects.forEach(projFile => {
        const li = document.createElement('li');
        li.className = 'file-item' + (projFile === workspace.activeFilename ? ' active' : '');
        li.style.fontWeight = 'bold';
        
        const nameSpan = document.createElement('span');
        nameSpan.textContent = projFile;
        li.appendChild(nameSpan);
        
        const delBtn = createDeleteButton(projFile);
        delBtn.style.marginLeft = 'auto';
        li.appendChild(delBtn);
        
        li.onclick = () => onFileSelect(projFile);
        container.appendChild(li);

        const projDoc = files[projFile] as any;
        if (projDoc && Array.isArray(projDoc.sheets)) {
          projDoc.sheets.forEach((sheetRef: any) => {
            const sheetName = typeof sheetRef === 'string' ? sheetRef : sheetRef.sheetName;
            if (sheetName && files[sheetName]) {
              const sli = document.createElement('li');
              sli.className = 'file-item' + (sheetName === workspace.activeFilename ? ' active' : '');
              sli.style.paddingLeft = '24px';
              sli.style.borderLeft = '1px solid #334155';
              
              const sNameSpan = document.createElement('span');
              sNameSpan.textContent = "↳ " + sheetName;
              sli.appendChild(sNameSpan);
              
              const sDelBtn = createDeleteButton(sheetName);
              sDelBtn.style.marginLeft = 'auto';
              sli.appendChild(sDelBtn);
              
              sli.onclick = () => onFileSelect(sheetName);
              container.appendChild(sli);
              
              const idx = sheets.indexOf(sheetName);
              if (idx > -1) sheets.splice(idx, 1);
            }
          });
        }
      });
    }

    if (sheets.length > 0) {
      renderSectionTitle('Unassigned Sheets');
      sheets.forEach(sheetFile => {
        const li = document.createElement('li');
        li.className = 'file-item' + (sheetFile === workspace.activeFilename ? ' active' : '');
        
        const nameSpan = document.createElement('span');
        nameSpan.textContent = sheetFile;
        li.appendChild(nameSpan);
        
        const delBtn = createDeleteButton(sheetFile);
        delBtn.style.marginLeft = 'auto';
        li.appendChild(delBtn);
        
        li.onclick = () => onFileSelect(sheetFile);
        container.appendChild(li);
      });
    }

    if (titleBlocks.length > 0) {
      renderSectionTitle('Title Blocks');
      titleBlocks.forEach(tbFile => {
        const li = document.createElement('li');
        li.className = 'file-item' + (tbFile === workspace.activeFilename ? ' active' : '');
        
        const nameSpan = document.createElement('span');
        nameSpan.textContent = tbFile;
        li.appendChild(nameSpan);
        
        const delBtn = createDeleteButton(tbFile);
        delBtn.style.marginLeft = 'auto';
        li.appendChild(delBtn);
        
        li.onclick = () => onFileSelect(tbFile);
        container.appendChild(li);
      });
    }

    if (details.length > 0) {
      renderSectionTitle('Details');
      details.forEach(detFile => {
        const li = document.createElement('li');
        li.className = 'file-item' + (detFile === workspace.activeFilename ? ' active' : '');
        
        const nameSpan = document.createElement('span');
        nameSpan.textContent = detFile;
        li.appendChild(nameSpan);
        
        const addBtn = document.createElement('span');
        addBtn.textContent = '+';
        addBtn.style.color = '#4ade80';
        addBtn.style.marginLeft = 'auto';
        addBtn.style.marginRight = '8px';
        addBtn.style.cursor = 'pointer';
        addBtn.title = 'Insert into active sheet';
        addBtn.onclick = (e) => {
          e.stopPropagation();
          onInsertDetail(detFile);
        };
        li.appendChild(addBtn);
        
        const delBtn = createDeleteButton(detFile);
        li.appendChild(delBtn);
        
        li.onclick = () => onFileSelect(detFile);
        container.appendChild(li);
      });
    }
  }
}
