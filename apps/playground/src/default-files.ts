// No imports needed

export const defaultFiles: Record<string, any> = {
  'title-block.json': {
  "type": "CAD::TitleBlock",
  "version": "1.0",
  "scale": "1:1",
  "parameters": {
    "projectAddress": { "type": "string", "label": "Project Address", "default": "N/A" },
    "projectNumber": { "type": "string", "label": "Project Number", "default": "0000" }
  },
  "geometry": [
    {
      "type": "CAD::Shape::Rectangle",
      "x": "0.25",
      "y": "0.25",
      "width": "35.5",
      "height": "23.5",
      "strokeWidth": "4",
      "color": "#1e293b",
      "fill": "none"
    },
    {
      "type": "CAD::Shape::Rectangle",
      "x": "31",
      "y": "0.25",
      "width": "4.75",
      "height": "23.5",
      "strokeWidth": "2",
      "color": "#334155",
      "fill": "none"
    },
    {
      "type": "CAD::Annotation::Text",
      "x": "31.5",
      "y": "23",
      "text": "PROJECT:",
      "fontSize": "16",
      "color": "#64748b",
      "space": "paper"
    },
    {
      "type": "CAD::Annotation::Text",
      "x": "31.5",
      "y": "22.5",
      "text": "{parameters.projectName}",
      "fontSize": "24",
      "color": "#e2e8f0",
      "space": "paper"
    },
    {
      "type": "CAD::Annotation::Text",
      "x": "31.5",
      "y": "20",
      "text": "ADDRESS:",
      "fontSize": "16",
      "color": "#64748b",
      "space": "paper"
    },
    {
      "type": "CAD::Annotation::Text",
      "x": "31.5",
      "y": "21.5",
      "text": "{parameters.projectAddress}",
      "fontSize": "14",
      "color": "#64748b",
      "space": "paper"
    },
    {
      "type": "CAD::Shape::Line",
      "x1": "31",
      "y1": "0.25",
      "x2": "31",
      "y2": "23.75",
      "color": "#334155",
      "strokeWidth": "2"
    },
    {
      "type": "CAD::Annotation::Text",
      "x": "31.5",
      "y": "3.5",
      "text": "SHEET NUMBER:",
      "fontSize": "16",
      "color": "#64748b",
      "space": "paper"
    },
    {
      "type": "CAD::Annotation::Text",
      "x": "32",
      "y": "3",
      "text": "{parameters.sheetNumber}",
      "fontSize": "48",
      "color": "#38bdf8",
      "space": "paper"
    }
  ]
},
  'welcome-detail.json': {
  "type": "CAD::Detail",
  "version": "1.0",
  "scale": "1:1",
  "parameters": {},
  "geometry": [
    {
      "type": "CAD::Annotation::Text",
      "x": "1",
      "y": "16",
      "text": "Welcome to AECKit Playground!",
      "fontSize": "48",
      "color": "#f1f5f9",
      "space": "paper"
    },
    {
      "type": "CAD::Annotation::Text",
      "x": "1",
      "y": "14",
      "text": "This playground lets you explore the AECKit CAD\nframework directly in your browser.\n\n1. Use the left sidebar to manage Projects, Sheets, and Details.\n2. Projects contain Sheets. Sheets contain Viewports.\n3. Viewports render Details at a specific scale.",
      "fontSize": "20",
      "color": "#cbd5e1",
      "space": "paper"
    },
    {
      "type": "CAD::Shape::Rectangle",
      "x": "0",
      "y": "0",
      "width": "20",
      "height": "18",
      "strokeWidth": "2",
      "color": "#3b82f6",
      "fill": "none",
      "componentId": "border"
    }
  ]
},
  'json-editor-guide.json': {
  "type": "CAD::Detail",
  "version": "1.0",
  "scale": "1:1",
  "parameters": {},
  "geometry": [
    {
      "type": "CAD::Annotation::Text",
      "x": "1",
      "y": "16",
      "text": "JSON Mode & Editing",
      "fontSize": "36",
      "color": "#38bdf8",
      "space": "paper"
    },
    {
      "type": "CAD::Annotation::Text",
      "x": "1",
      "y": "14",
      "text": "Click on any element in the canvas to select it.\n\nThen, open the Properties pane on the right and\nclick the 'JSON' toggle to view its raw data.\n\nYou can edit the JSON directly (e.g., change the\n'color' or 'width' property) and watch the canvas\nupdate in real-time!",
      "fontSize": "16",
      "color": "#94a3b8",
      "space": "paper"
    },
    {
      "type": "CAD::Shape::Rectangle",
      "x": "0",
      "y": "0",
      "width": "18",
      "height": "18",
      "strokeWidth": "2",
      "color": "#38bdf8",
      "fill": "none",
      "componentId": "border"
    },
    {
      "type": "CAD::Shape::Circle",
      "cx": "9",
      "cy": "4",
      "r": "3",
      "color": "#f43f5e",
      "fill": "#881337",
      "componentId": "demo-circle"
    }
  ]
},
  'components-demo.json': {
  "type": "CAD::Detail",
  "version": "1.0",
  "scale": "1:1",
  "parameters": {},
  "geometry": [
    {
      "type": "CAD::Annotation::Text",
      "x": "1",
      "y": "8",
      "text": "Components & Tools",
      "fontSize": "24",
      "color": "#a78bfa",
      "space": "paper"
    },
    {
      "type": "CAD::Annotation::Text",
      "x": "1",
      "y": "7",
      "text": "Use the bottom toolbar to add Viewports to sheets.\n\nWhen editing a detail, you can add lines,\nrectangles, and text elements.\n\nTry clicking on the shapes below to edit\ntheir properties.",
      "fontSize": "14",
      "color": "#94a3b8",
      "space": "paper"
    },
    {
      "type": "CAD::Shape::Rectangle",
      "x": "0",
      "y": "0",
      "width": "12",
      "height": "10",
      "strokeWidth": "2",
      "color": "#a78bfa",
      "fill": "none",
      "componentId": "border"
    },
    {
      "type": "CAD::Shape::Rectangle",
      "x": "1",
      "y": "1",
      "width": "4",
      "height": "2",
      "color": "#22c55e",
      "fill": "#14532d",
      "componentId": "demo-rect"
    },
    {
      "type": "CAD::Shape::Line",
      "x1": "6",
      "y1": "1",
      "x2": "10",
      "y2": "3",
      "color": "#eab308",
      "strokeWidth": "4",
      "componentId": "demo-line"
    }
  ]
},
  'DEMO-1.json': {
  "type": "CAD::SheetConfiguration",
  "sheetNumber": "DEMO-1",
  "sheetName": "Playground Tutorial",
  "viewports": [
    {
      "detail": "welcome-detail.json",
      "x": "1",
      "y": "10",
      "width": "15",
      "height": "13",
      "scale": "1:1.5",
      "detailNumber": "1",
      "componentId": "vp_welcome"
    },
    {
      "detail": "json-editor-guide.json",
      "x": "17",
      "y": "10",
      "width": "13",
      "height": "13",
      "scale": "1:1.5",
      "detailNumber": "2",
      "componentId": "vp_json"
    },
    {
      "detail": "components-demo.json",
      "x": "1",
      "y": "1",
      "width": "15",
      "height": "8",
      "scale": "1:1.5",
      "detailNumber": "3",
      "componentId": "vp_components"
    }
  ]
},
  'demo-project.json': {
  "type": "CAD::Project",
  "projectName": "PLAYGROUND TUTORIAL",
  "parameters": {
    "projectAddress": "AECKit Virtual Space",
    "projectNumber": "2026-001"
  },
  "defaultTitleBlockRef": "title-block.json",
  "defaultPaperSize": "ARCH D",
  "sheets": [
    "DEMO-1.json"
  ]
}
};
