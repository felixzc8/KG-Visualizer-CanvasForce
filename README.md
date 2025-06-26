# Knowledge Graph Visualizer

An interactive web-based tool for visualizing knowledge graphs using D3.js and ForceGraph. This application allows you to upload entities and relationships data to create dynamic, interactive network visualizations.

## Features

- **Interactive Graph Visualization**: Powered by ForceGraph with D3.js force simulation
- **File Upload Support**: Load entities (JSON) and relationships (JSON/CSV) from local files
- **Node Clustering**: Automatic clustering with color-coded visualization
- **Graph Controls**: 
  - Zoom to fit
  - Center graph
  - Reset graph
  - Toggle cluster coloring
- **Dark/Light Mode**: Toggle between light and dark themes
- **Interactive Elements**: 
  - Click nodes and links to view details
  - Hover effects and connection highlighting
  - Responsive layout

## Getting Started

1. Open `index.html` in a web browser
2. Upload your data files:
   - **Entities**: JSON file containing node data
   - **Relationships**: JSON or CSV file containing edge data
3. Click "Generate Graph" to visualize your knowledge graph

## Data Format

### Entities JSON Format
```json
[
  {
    "id": "unique_id",
    "name": "Entity Name",
    "entity_type": "type",
    "attributes": {},
    "topic_name": "topic",
    "created_at": "timestamp",
    "updated_at": "timestamp"
  }
]
```

### Relationships JSON Format
```json
[
  {
    "id": "relationship_id",
    "source_entity_id": "source_id",
    "target_entity_id": "target_id",
    "description": "relationship description",
    "weight": 1.0,
    "meta": {},
    "document_id": "doc_id",
    "chunk_id": "chunk_id",
    "last_modified_at": "timestamp"
  }
]
```

## Requirements

- Modern web browser with JavaScript enabled
- Internet connection (for D3.js and ForceGraph CDN dependencies)
- JSON data files in the specified format

## Technologies Used

- [D3.js](https://d3js.org/) v7 - Data visualization library
- [ForceGraph](https://github.com/vasturiano/force-graph) - Force-directed graph visualization
- HTML5/CSS3/JavaScript - Core web technologies

## License

This project is open source and available under the MIT License.