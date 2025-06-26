let graph;
let entitiesData = null;
let relationshipsData = null;

let nodes = null;
let links = null;

(function() {
    const mode = localStorage.getItem('colorMode');
    if (mode === 'dark') {
        document.body.classList.add('dark-mode');
    } else {
        document.body.classList.remove('dark-mode');
    }
})();

document.getElementById('toggle-mode').onclick = function() {
    const isDark = document.body.classList.toggle('dark-mode');
    localStorage.setItem('colorMode', isDark ? 'dark' : 'light');
};


document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('zoom-fit').onclick = function() {
        zoomToFit();
    };
    document.getElementById('center-graph').onclick = function() {
        centerGraph();
    };
    document.getElementById('reset-graph').onclick = function() {
        resetGraph();
    };
});

document.addEventListener('DOMContentLoaded', function() {
    initializeGraph();
    const entitiesFile = document.getElementById('entities-file');
    const relationshipsFile = document.getElementById('relationships-file');
    const generateButton = document.getElementById('generate-button');

    entitiesFile.addEventListener('change', (event) => handleFileUpload(event, 'entities'));
    relationshipsFile.addEventListener('change', (event) => handleFileUpload(event, 'relationships'));
    generateButton.addEventListener('click', generateGraph);
});

function initializeGraph() {
    const graphContainer = document.getElementById('graph-container');
    console.log('Initializing ForceGraph...', { ForceGraph: typeof ForceGraph, container: graphContainer });

    
    try {
        graph = ForceGraph()(graphContainer)
            .width(graphContainer.clientWidth)
            .height(graphContainer.clientHeight)
            .backgroundColor('transparent')
            .nodeVal(node => Math.max(1, (node.attributes ? Object.keys(node.attributes).length : 1) * 2))
            .linkWidth(link => Math.max(1, (link.weight || 1) * 2))
            .linkColor('#999')
            .linkDirectionalArrowLength(6)
            .linkDirectionalArrowRelPos(1)
            .linkCurvature(0.1)
            .onNodeClick(onNodeClick)
            .onLinkClick(onLinkClick)
            .onBackgroundClick(onBackgroundClick)
            .d3Force('x', d3.forceX(0).strength(0.05))
            .d3Force('y', d3.forceY(0).strength(0.05))
            .d3Force("link", d3.forceLink().id(d => d.id))
            .d3Force("charge", d3.forceManyBody().strength(-80));
            
        
    } catch (error) {
        console.error('Error initializing graph:', error);
        alert('Failed to initialize graph. Error: ' + error.message);
        return;
    }

    // Handle window resize
    window.addEventListener('resize', () => {
        if (graph && typeof graph.width === 'function') {
            graph.width(graphContainer.clientWidth)
                 .height(graphContainer.clientHeight);
        }
    });
}

function handleFileUpload(event, fileType) {
    const file = event.target.files[0];
    const fileNameSpan = document.getElementById(`${fileType}-file-name`);
    
    if (!file) {
        fileNameSpan.textContent = 'No file chosen';
        if (fileType === 'entities') {
            entitiesData = null;
        } else {
            relationshipsData = null;
        }
        return;
    }

    fileNameSpan.textContent = file.name;
    readFile(file, (data) => {
        try {
            const parsedData = JSON.parse(data);
            if (fileType === 'entities') {
                entitiesData = parsedData;
            } else {
                relationshipsData = parsedData;
            }
            console.log(`${fileType} loaded:`, parsedData);
        } catch (error) {
            console.error(`Error parsing ${fileType} file:`, error);
            alert(`Error parsing ${fileType} file. Please ensure it's valid JSON.`);
        }
    });
}

function readFile(file, callback) {
    const reader = new FileReader();
    reader.onload = function(e) {
        callback(e.target.result);
    };
    reader.onerror = function() {
        console.error('Error reading file:', file.name);
        alert('Error reading file: ' + file.name);
    };
    reader.readAsText(file);
}

function processEntities(entitiesData) {
    return entitiesData.map(entity => ({
        id: entity.id,
        name: entity.name || entity.id,
        attributes: entity.attributes,
        entity_type: entity.entity_type || 'Unknown',
        topic_name: entity.topic_name,
        created_at: entity.created_at,
        updated_at: entity.updated_at,
        val: Math.max(1, (entity.attributes ? Object.keys(entity.attributes).length : 1) * 2)
    }));
}

function processRelationships(relationshipsData) {
    return relationshipsData.map(relationship => ({
        id: relationship.id,
        description: relationship.description,
        meta: relationship.meta,
        weight: relationship.weight || 1,
        source: relationship.source_entity_id,
        target: relationship.target_entity_id,
        last_modified_at: relationship.last_modified_at,
        document_id: relationship.document_id,
        chunk_id: relationship.chunk_id,
    }));
}

function generateGraph() {
    if (!entitiesData || !relationshipsData) {
        alert('Please upload both entities and relationships files');
        return;
    }

    try {
        nodes = processEntities(entitiesData);
        links = processRelationships(relationshipsData);
        
        const nodeIds = new Set(nodes.map(node => node.id));
        const validLinks = links.filter(link => {
            const sourceExists = nodeIds.has(link.source);
            const targetExists = nodeIds.has(link.target);
            
            if (!sourceExists || !targetExists) {
                console.warn('Invalid link found:', link, 'Source exists:', sourceExists, 'Target exists:', targetExists);
            }
            
            return sourceExists && targetExists;
        });
        
        const graphData = {
            nodes: nodes,
            links: validLinks
        };
        
        console.log('Generated graph data:', graphData);
        console.log(`Nodes: ${nodes.length}, Valid Links: ${validLinks.length}, Invalid Links: ${links.length - validLinks.length}`);
        
        graph.graphData(graphData);
        
        setTimeout(() => {
            graph.zoomToFit(400, 50);
        }, 1000);
        
    } catch (error) {
        console.error('Error generating graph:', error);
        alert('Error generating graph. Please check the console for details.');
    }
}

function onNodeClick(node, event) {
    showDetails('Node Details', {
        'ID': node.id,
        'Name': node.name,
        'Type': node.entity_type,
        'Topic': node.topic_name,
        'Attributes': node.attributes ? JSON.stringify(node.attributes, null, 2) : 'None',
        'Created': node.created_at,
        'Updated': node.updated_at
    });
    
    // Highlight the clicked node and its connections
    highlightConnections(node);
}

function onLinkClick(link, event) {
    showDetails('Relationship Details', {
        'ID': link.id,
        'Description': link.description,
        'Weight': link.weight,
        'Source': link.source,
        'Target': link.target,
        'Meta': link.meta ? JSON.stringify(link.meta, null, 2) : 'None',
        'Document ID': link.document_id,
        'Chunk ID': link.chunk_id,
        'Last Modified': link.last_modified_at
    });
}

function onBackgroundClick() {
    hideDetails();
    clearHighlight();
}

function highlightConnections(node) {
    const connectedNodeIds = new Set();
    const connectedLinkIds = new Set();
    
    graph.graphData().links.forEach(link => {
        if (link.source.id === node.id) {
            connectedNodeIds.add(link.target.id);
            connectedLinkIds.add(link.id);
        } else if (link.target.id === node.id) {
            connectedNodeIds.add(link.source.id);
            connectedLinkIds.add(link.id);
        }
    });
    
    const computedStyles = getComputedStyle(document.body);
    const nodeSelected = computedStyles.getPropertyValue('--node-selected').trim();
    const nodeConnected = computedStyles.getPropertyValue('--node-connected').trim();
    const nodeDefault = computedStyles.getPropertyValue('--node-default').trim();
    const linkSelected = computedStyles.getPropertyValue('--link-selected').trim();
    const linkDefault = computedStyles.getPropertyValue('--link-default').trim();
    
    graph
        .nodeColor(n => {
            if (n.id === node.id) {
                return nodeSelected;
            } else if (connectedNodeIds.has(n.id)) {
                return nodeConnected;
            } else {
                return nodeDefault;
            }
        })
        .linkColor(l => {
            if (connectedLinkIds.has(l.id)) {
                return linkSelected;
            } else {
                return linkDefault;
            }
                 })
         .linkWidth(l => connectedLinkIds.has(l.id) ? 4 : 1);
    
}

function clearHighlight() {
    const linkDefault = getComputedStyle(document.body).getPropertyValue('--link-default').trim();
    
    graph
        .nodeColor(null)
        .linkColor(linkDefault)
        .linkWidth(link => Math.max(1, (link.weight || 1) * 2));
    
}

function showDetails(title, details) {
    const detailsPanel = document.getElementById('details');
    
    let html = `
        <button class="details-close" onclick="hideDetails()">&times;</button>
        <h3>${title}</h3>
    `;
    
    for (const [key, value] of Object.entries(details)) {
        html += `<p><strong>${key}:</strong><br/>${value || 'N/A'}</p>`;
    }
    
    detailsPanel.innerHTML = html;
    detailsPanel.style.display = 'block';
}

function hideDetails() {
    const detailsPanel = document.getElementById('details');
    detailsPanel.style.display = 'none';
}


function centerGraph() {
    graph.centerAt(0, 0, 1000);
}

function zoomToFit() {
    graph.zoomToFit(400, 50);
}

function resetGraph() {
    if (entitiesData && relationshipsData) {
        generateGraph();
    }
}
