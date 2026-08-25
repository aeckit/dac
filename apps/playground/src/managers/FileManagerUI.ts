import type { WorkspaceManager } from '../Workspace';

export interface FileManagerOptions {
  container: HTMLUListElement;
  workspace: WorkspaceManager;
  onFileSelect: (filename: string) => void;
  onInsertDetail: (filename: string) => void;
  onNewProject: () => void;
  onNewSheet: (projectFilename: string) => void;
  onNewDetail: () => void;
}

export class FileManagerUI {
  private options: FileManagerOptions;
  constructor(options: FileManagerOptions) {
    this.options = options;
  }

  public render() {
    const { container, workspace, onFileSelect, onInsertDetail, onNewProject, onNewSheet, onNewDetail } = this.options;
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

    const renderSectionTitle = (title: string, onAdd?: () => void) => {
      const header = document.createElement('div');
      header.style.display = 'flex';
      header.style.justifyContent = 'space-between';
      header.style.alignItems = 'center';
      header.style.padding = '12px 15px 4px 15px';
      
      const titleSpan = document.createElement('span');
      titleSpan.textContent = title;
      titleSpan.style.fontSize = '10px';
      titleSpan.style.textTransform = 'uppercase';
      titleSpan.style.color = '#94a3b8';
      titleSpan.style.fontWeight = 'bold';
      titleSpan.style.letterSpacing = '0.5px';
      header.appendChild(titleSpan);
      
      if (onAdd) {
        const addBtn = document.createElement('span');
        addBtn.textContent = '+';
        addBtn.style.color = '#4ade80';
        addBtn.style.cursor = 'pointer';
        addBtn.style.fontSize = '14px';
        addBtn.style.lineHeight = '10px';
        addBtn.title = `New ${title.replace(/s$/, '')}`;
        addBtn.onclick = (e) => {
          e.stopPropagation();
          onAdd();
        };
        header.appendChild(addBtn);
      }
      
      container.appendChild(header);
    };

    const projects = Object.keys(files).filter(k => files[k].type === 'CAD::Project');
    const sheets = Object.keys(files).filter(k => files[k].type === 'CAD::SheetConfiguration');
    const titleBlocks = Object.keys(files).filter(k => files[k].type === 'CAD::TitleBlock');
    const details = Object.keys(files).filter(k => files[k].type === 'CAD::Detail');
    
    const classified = new Set([...projects, ...sheets, ...titleBlocks, ...details]);
    const others = Object.keys(files).filter(k => !classified.has(k));
    details.push(...others);

    const activeFileDoc = workspace.activeFilename ? files[workspace.activeFilename] : null;
    const isSheetActive = activeFileDoc && activeFileDoc.type === 'CAD::SheetConfiguration';

    renderSectionTitle('Projects', onNewProject);
    if (projects.length > 0) {
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
          
          const addSheetLi = document.createElement('li');
          addSheetLi.className = 'file-item';
          addSheetLi.style.paddingLeft = '24px';
          addSheetLi.style.borderLeft = '1px solid #334155';
          addSheetLi.style.color = '#4ade80';
          addSheetLi.style.fontSize = '12px';
          
          const addSheetSpan = document.createElement('span');
          addSheetSpan.textContent = '+ Add Sheet';
          addSheetLi.appendChild(addSheetSpan);
          
          addSheetLi.onclick = (e) => {
            e.stopPropagation();
            onNewSheet(projFile);
          };
          container.appendChild(addSheetLi);
        }
      });
    }

    renderSectionTitle('Title Blocks');
    if (titleBlocks.length > 0) {
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

    renderSectionTitle('Details', onNewDetail);
    if (details.length > 0) {
      details.forEach(detFile => {
        const li = document.createElement('li');
        li.className = 'file-item' + (detFile === workspace.activeFilename ? ' active' : '');
        
        const nameSpan = document.createElement('span');
        nameSpan.textContent = detFile;
        li.appendChild(nameSpan);
        
        if (isSheetActive) {
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
        }
        
        const delBtn = createDeleteButton(detFile);
        if (!isSheetActive) {
          delBtn.style.marginLeft = 'auto';
        }
        li.appendChild(delBtn);
        
        li.onclick = () => onFileSelect(detFile);
        container.appendChild(li);
      });
    }
  }
}
