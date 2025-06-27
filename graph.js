let graph;
let entitiesData = null;
let relationshipsData = null;

let nodes = null;
let links = null;
let clustersCalculated = false;

const linkDefaultDistance = 30;
const chargeDefaultStrength = -80;
const linkDefaultWidth = 1;

let colors = null;
let mode = null;
let clusterMode = null;


document.addEventListener('DOMContentLoaded', function() {
    mode = localStorage.getItem('colorMode');
    if (mode === 'dark') {
        document.body.classList.add('dark-mode');
    }

    colors = getCurrentColors();
    clusterMode = localStorage.getItem('clusterColorMode');

    initializeGraph();
    const entitiesFile = document.getElementById('entities-file');
    const relationshipsFile = document.getElementById('relationships-file');
    const generateButton = document.getElementById('generate-button');

    entitiesFile.addEventListener('change', (event) => handleFileUpload(event, 'entities'));
    relationshipsFile.addEventListener('change', (event) => handleFileUpload(event, 'relationships'));
    generateButton.addEventListener('click', generateGraph);

    document.getElementById('zoom-fit').onclick = zoomToFit;
    document.getElementById('center-graph').onclick = centerGraph;
    document.getElementById('reset-graph').onclick = resetGraph;
    document.getElementById('toggle-mode').onclick = toggleDarkMode;
    document.getElementById('color-by-cluster').onclick = toggleColorByCluster;
});

function drawNodeWithLabel(node, ctx, globalScale) {
    const nodeRadius = 8;
    ctx.beginPath();
    ctx.arc(node.x, node.y, nodeRadius, 0, 2 * Math.PI, false);
    
    const clusterModeOn = clusterMode === 'enabled';
    let nodeColor;
    if (clusterModeOn && clustersCalculated) {
        const clusterId = node.clusterId || 0;
        nodeColor = colors.clusterColors[clusterId % colors.clusterColors.length];
    } else {
        nodeColor = colors.nodeColor;
    }
    
    ctx.fillStyle = nodeColor;
    ctx.fill();

    const label = node.name;
    const fontSize = Math.max(8, nodeRadius * 0.3);
    ctx.font = `${fontSize}px Sans-Serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = colors.textColor;
    ctx.fillText(label, node.x, node.y + nodeRadius + fontSize * 0.7);
}

function initializeGraph() {
    const graphContainer = document.getElementById('graph-container');
    console.log('Initializing ForceGraph...', { ForceGraph: typeof ForceGraph, container: graphContainer });
    
    colors = getCurrentColors();
    
    try {
        graph = ForceGraph()(graphContainer)
            .width(graphContainer.clientWidth)
            .height(graphContainer.clientHeight)
            .backgroundColor('transparent')
            .nodeColor(() => colors.nodeColor)
            .nodeCanvasObject(drawNodeWithLabel)
            .linkWidth(linkDefaultWidth)
            .linkColor(() => colors.linkColor)
            .linkDirectionalArrowLength(6)
            .linkDirectionalArrowRelPos(1)
            .linkCurvature(0.1)
            .onNodeClick(onNodeClick)
            .onLinkClick(onLinkClick)
            .onBackgroundClick(onBackgroundClick)
            .d3Force('x', d3.forceX(0).strength(0.05))
            .d3Force('y', d3.forceY(0).strength(0.05))
            .d3Force("link", d3.forceLink().id(d => d.id).distance(linkDefaultDistance))
            .d3Force("charge", d3.forceManyBody().strength(chargeDefaultStrength));
            
        
    } catch (error) {
        console.error('Error initializing graph:', error);
        alert('Failed to initialize graph. Error: ' + error.message);
        return;
    }


    window.addEventListener('resize', () => {
        graph.width(graphContainer.clientWidth)
            .height(graphContainer.clientHeight);
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
        name: entity.name,
        attributes: entity.attributes,
        entity_type: entity.entity_type,
        topic_name: entity.topic_name,
        created_at: entity.created_at,
        updated_at: entity.updated_at,
    }));
}

function processRelationships(relationshipsData) {
    return relationshipsData.map(relationship => ({
        id: relationship.id,
        description: relationship.description,
        meta: relationship.meta,
        weight: relationship.weight,
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
        
        clustersCalculated = false;
        
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
            calculateAndCacheClusters();
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
    
    graph.d3Force("link").distance(link => {
        if (connectedLinkIds.has(link.id)) {
            return 120;
        }
        return linkDefaultDistance;
    });
    graph.d3ReheatSimulation();
}

function clearHighlight() {
    graph.d3Force("link").distance(linkDefaultDistance);
    graph.d3Force("charge").strength(chargeDefaultStrength);
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

function toggleDarkMode() {
    const isDark = document.body.classList.toggle('dark-mode');
    localStorage.setItem('colorMode', isDark ? 'dark' : 'light');
    colors = getCurrentColors();
}

function getCurrentColors() {
    const isDarkMode = document.body.classList.contains('dark-mode');
    const computedStyles = getComputedStyle(document.body);
    return {
        textColor: computedStyles.getPropertyValue('--text-color').trim(),
        nodeColor: computedStyles.getPropertyValue('--node-default').trim(),
        linkColor: computedStyles.getPropertyValue('--link-default').trim(),
        clusterColors: [
            computedStyles.getPropertyValue('--cluster-color-0').trim(),
            computedStyles.getPropertyValue('--cluster-color-1').trim(),
            computedStyles.getPropertyValue('--cluster-color-2').trim(),
            computedStyles.getPropertyValue('--cluster-color-3').trim(),
            computedStyles.getPropertyValue('--cluster-color-4').trim(),
            computedStyles.getPropertyValue('--cluster-color-5').trim(),
            computedStyles.getPropertyValue('--cluster-color-6').trim(),
            computedStyles.getPropertyValue('--cluster-color-7').trim(),
            computedStyles.getPropertyValue('--cluster-color-8').trim(),
            computedStyles.getPropertyValue('--cluster-color-9').trim()
        ]
    };
}

function toggleColorByCluster() {
    if (!graph) {
        return;
    }
    newMode = clusterMode === 'enabled' ? 'disabled' : 'enabled';
    localStorage.setItem('clusterColorMode', newMode);
    clusterMode = newMode;
    
    if (newMode) {
        console.log('Cluster coloring enabled.');
    } else {
        console.log('Cluster coloring disabled. Returned to default node colors');
    }
}

function calculateAndCacheClusters() {
    if (!nodes || !links) {
        return;
    }
    
    const clusters = findClusters();
    
    nodes.forEach(node => {
        node.clusterId = clusters.get(node.id) || 0;
    });
    
    clustersCalculated = true;
    console.log(`Clusters calculated and cached. Found ${Math.max(...clusters.values()) + 1} clusters`);
}

function findClusters() {
    const clusters = new Map();
    const visited = new Set();
    let clusterId = 0;
    
    const adjacencyList = new Map();
    nodes.forEach(node => {
        adjacencyList.set(node.id, []);
    });
    
    links.forEach(link => {
        const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
        const targetId = typeof link.target === 'object' ? link.target.id : link.target;
        
        if (adjacencyList.has(sourceId) && adjacencyList.has(targetId)) {
            adjacencyList.get(sourceId).push(targetId);
            adjacencyList.get(targetId).push(sourceId);
        }
    });
    
    function dfs(nodeId, currentClusterId) {
        if (visited.has(nodeId)) return;
        
        visited.add(nodeId);
        clusters.set(nodeId, currentClusterId);
        
        const neighbors = adjacencyList.get(nodeId) || [];
        neighbors.forEach(neighborId => {
            if (!visited.has(neighborId)) {
                dfs(neighborId, currentClusterId);
            }
        });
    }
    
    // Find all connected components
    nodes.forEach(node => {
        if (!visited.has(node.id)) {
            dfs(node.id, clusterId);
            clusterId++;
        }
    });
    
    return clusters;
}

