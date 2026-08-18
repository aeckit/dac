// No imports needed

export const defaultFiles: Record<string, any> = {
  'title-block.json': {
  "type": "CAD::Detail",
  "version": "1.0",
  "scale": "1:1",
  "parameters": {},
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
      "type": "CAD::Annotation::TextBox",
      "x": "31.5",
      "y": "21.5",
      "width": "4",
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
  'general-notes.json': {
  "type": "CAD::Detail",
  "version": "1.0",
  "scale": "1:1",
  "parameters": {},
  "geometry": [
    {
      "type": "CAD::Annotation::Text",
      "x": "0",
      "y": "17",
      "text": "GENERAL NOTES",
      "fontSize": "32",
      "color": "#f1f5f9",
      "space": "paper"
    },
    {
      "type": "CAD::Annotation::TextBox",
      "x": "0",
      "y": "16",
      "width": "8",
      "text": "1. ALL CONCRETE SHALL BE MINIMUM 3000 PSI AT 28 DAYS.\n2. ALL REINFORCING STEEL SHALL BE ASTM A615 GRADE 60.\n3. CONTRACTOR SHALL VERIFY ALL DIMENSIONS PRIOR TO CONSTRUCTION.\n4. ANY DISCREPANCIES SHALL BE REPORTED TO THE ENGINEER OF RECORD IMMEDIATELY.",
      "fontSize": "16",
      "color": "#94a3b8",
      "space": "paper"
    },
    {
      "type": "CAD::Annotation::Image",
      "x": "0",
      "y": "4",
      "width": "8",
      "height": "6",
      "href": "test-image.jpg"
    }
  ]
},
  'detail-prototype.json': {
  "type": "CAD::Detail",
  "version": "dac/v1",
  "scale": "1/2\\",
  "parameters": {
    "sillPlateOffset": {
      "type": "Number",
      "default": 1.5,
      "min": -8,
      "max": 8,
      "label": "Horizontal Offset (in)",
      "componentId": "sill_plate_1",
      "value": 0
    },
    "sillPlateVisible": {
      "type": "Boolean",
      "default": true,
      "label": "Sill Plate Visible",
      "componentId": "sill_plate_1",
      "value": true
    },
    "anchorBoltOffset": {
      "type": "Number",
      "default": 0,
      "min": -3,
      "max": 3,
      "label": "Bolt Local Offset (in)",
      "componentId": "anchor_bolt_1",
      "value": -1.5
    }
  },
  "geometry": [
    {
      "id": "foundation_wall_rect",
      "type": "CAD::Shape::Rectangle",
      "componentId": "foundation_wall_1",
      "componentType": "CAD::Component::ConcreteWall",
      "x": 18,
      "y": 2,
      "width": 24,
      "height": 16,
      "hatch": "Concrete"
    },
    {
      "id": "sill_plate_rect",
      "type": "CAD::Shape::Rectangle",
      "componentId": "sill_plate_1",
      "componentType": "CAD::Component::SillPlate",
      "x": "30 + {parameters.sillPlateOffset} - 7",
      "y": 18,
      "width": 14,
      "height": 3.8,
      "hatch": "TimberCross",
      "visible": "{parameters.sillPlateVisible}"
    },
    {
      "id": "anchor_bolt_assembly",
      "type": "CAD::Shape::Rectangle",
      "componentId": "anchor_bolt_1",
      "componentType": "CAD::Component::AnchorBolt",
      "x": "30 + {parameters.sillPlateOffset} + {parameters.anchorBoltOffset} - 0.375",
      "y": 12,
      "width": 0.75,
      "height": 10,
      "fill": "#64748b",
      "color": "#cbd5e1"
    },
    {
      "id": "anchor_bolt_washer",
      "type": "CAD::Shape::Rectangle",
      "componentId": "anchor_bolt_1",
      "componentType": "CAD::Component::AnchorBolt",
      "x": "30 + {parameters.sillPlateOffset} + {parameters.anchorBoltOffset} - 1.0",
      "y": 21.8,
      "width": 2,
      "height": 0.25,
      "fill": "#94a3b8",
      "color": "#e2e8f0"
    },
    {
      "id": "anchor_bolt_nut",
      "type": "CAD::Shape::Rectangle",
      "componentId": "anchor_bolt_1",
      "componentType": "CAD::Component::AnchorBolt",
      "x": "30 + {parameters.sillPlateOffset} + {parameters.anchorBoltOffset} - 0.6",
      "y": 22.05,
      "width": 1.2,
      "height": 0.8,
      "fill": "#475569",
      "color": "#cbd5e1"
    },
    {
      "id": "center_cross_h",
      "type": "CAD::Shape::Line",
      "componentId": "anchor_crosshair_1",
      "componentType": "CAD::Component::ReferenceAnchor",
      "x1": 29,
      "y1": 18,
      "x2": 31,
      "y2": 18,
      "color": "#f43f5e",
      "strokeWidth": 1.5
    },
    {
      "id": "center_cross_v",
      "type": "CAD::Shape::Line",
      "componentId": "anchor_crosshair_1",
      "componentType": "CAD::Component::ReferenceAnchor",
      "x1": 30,
      "y1": 17,
      "x2": 30,
      "y2": 19,
      "color": "#f43f5e",
      "strokeWidth": 1.5
    },
    {
      "id": "center_cross_c",
      "type": "CAD::Shape::Circle",
      "componentId": "anchor_crosshair_1",
      "componentType": "CAD::Component::ReferenceAnchor",
      "cx": 30,
      "cy": 18,
      "r": 0.3,
      "color": "#f43f5e",
      "strokeWidth": 1.5
    },
    {
      "id": "offset_dimension_line",
      "type": "CAD::Annotation::Dimension",
      "componentId": "dimension_1",
      "componentType": "CAD::Annotation::OffsetDimension",
      "x1": 30,
      "y1": 18,
      "x2": "30 + {parameters.sillPlateOffset}",
      "y2": 18,
      "offset": 60,
      "text": "{parameters.sillPlateOffset} in",
      "visible": "{parameters.sillPlateVisible}"
    }
  ]
},
  'sheets/S-101.json': {
  "type": "CAD::Sheet",
  "sheetNumber": "S-101",
  "sheetName": "Foundation Plan & Details",
  "paperSize": "Arch D",
  "titleBlock": "../title-block.json",
  "viewports": [
    {
      "detail": "../detail-prototype.json",
      "x": "2",
      "y": "2",
      "width": "10",
      "height": "8",
      "scale": "1\"=1'-0\"",
      "detailNumber": "1",
      "componentId": "vp_default_1"
    },
    {
      "detail": "../detail-prototype.json",
      "x": "15",
      "y": "10",
      "width": "10",
      "height": "8",
      "scale": "1/2\"=1'-0\"",
      "detailNumber": "2",
      "componentId": "vp_default_2"
    },
    {
      "detail": "../general-notes.json",
      "x": "20",
      "y": "2",
      "width": "8",
      "height": "6",
      "scale": "1:1",
      "detailNumber": "3",
      "hideScale": true,
      "hideDetailNumber": true,
      "componentId": "vp_default_3"
    }
  ]
},
  'demo-drawing-set.json': {
  "type": "CAD::DrawingSet",
  "project": "AECKit Demo Project",
  "titleBlockData": {
    "projectName": "ACME WAREHOUSE",
    "projectAddress": "123 INDUSTRIAL WAY\nSEATTLE, WA 98101",
    "sheetNumber": "S-101"
  },
  "sheets": [
    "sheets/S-101.json"
  ]
},
};
