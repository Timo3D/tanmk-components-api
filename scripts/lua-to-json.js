// robust-lua-parser.js
const fs = require('fs');
const path = require('path');

/**
 * A brute force parser specifically designed for your Lua format
 * @param {string} luaContent - Content of the Lua file
 * @returns {Object} Parsed data
 */
function parseLuaFile(luaContent) {
  console.log("Starting robust parsing of Lua data...");
  
  // Remove return and trailing semicolon if present
  luaContent = luaContent.replace(/^return\s*{/, '{');
  luaContent = luaContent.replace(/};$/, '}');
  
  // Split the content by components (each component is a line starting with ['ComponentName'])
  const result = {};
  let currentPosition = 0;
  
  // Process each component
  while (true) {
    // Find the next component
    const componentMatch = luaContent.substring(currentPosition).match(/\['([^']+)'\]\s*=\s*{id\s*=\s*(\d+)/);
    if (!componentMatch) break;
    
    const componentName = componentMatch[1];
    const componentId = componentMatch[2];
    console.log(`Found component: ${componentName}`);
    
    // Move past the component name and ID
    currentPosition += componentMatch.index + componentMatch[0].length;
    
    // Find where this component ends (next component starts or end of file)
    let nextComponentIndex = luaContent.indexOf("[", currentPosition);
    if (nextComponentIndex === -1) nextComponentIndex = luaContent.length;
    
    // Extract the component's content
    const componentContent = luaContent.substring(currentPosition, nextComponentIndex);
    currentPosition = nextComponentIndex;
    
    // Create component entry
    result[componentName] = {
      id: componentId,
      metadata: {
        attributes: {},
        config: {}
      }
    };
    
    // Extract attributes section
    const attributesMatch = componentContent.match(/attributes\s*=\s*{([^}]+)}/);
    if (attributesMatch) {
      const attributesContent = attributesMatch[1];
      
      // Process CFrame
      const cfMatch = attributesContent.match(/CF\s*=\s*CFrame\.new\(([^)]+)\)/);
      if (cfMatch) {
        const cfValues = cfMatch[1].split(',').map(v => parseFloat(v.trim()));
        result[componentName].metadata.attributes.CF = {
          position: [cfValues[0], cfValues[1], cfValues[2]],
          orientation: [
            cfValues[3] || 1, cfValues[4] || 0, cfValues[5] || 0,
            cfValues[6] || 0, cfValues[7] || 1, cfValues[8] || 0,
            cfValues[9] || 0, cfValues[10] || 0, cfValues[11] || 1
          ]
        };
      }
      
      // Process string attributes
      const stringMatches = attributesContent.matchAll(/(\w+)\s*=\s*"([^"]+)"/g);
      for (const match of stringMatches) {
        result[componentName].metadata.attributes[match[1]] = match[2];
      }
      
      // Process numeric attributes
      const numericMatches = attributesContent.matchAll(/(\w+)\s*=\s*(\d+)/g);
      for (const match of numericMatches) {
        if (!result[componentName].metadata.attributes[match[1]]) {
          result[componentName].metadata.attributes[match[1]] = parseInt(match[2]);
        }
      }
    }
    
    // Extract config section
    const configStart = componentContent.indexOf("config = {");
    if (configStart !== -1) {
      // Find where the config section starts and ends
      const configContentStart = configStart + "config = {".length;
      
      // Count braces to find the matching closing brace
      let braceCount = 1;
      let configEnd = configContentStart;
      
      for (let i = configContentStart; i < componentContent.length; i++) {
        if (componentContent[i] === '{') braceCount++;
        if (componentContent[i] === '}') braceCount--;
        
        if (braceCount === 0) {
          configEnd = i;
          break;
        }
      }
      
      const configContent = componentContent.substring(configContentStart, configEnd);
      
      // Extract basic config properties
      const basicProps = configContent.split(',');
      for (const prop of basicProps) {
        const propMatch = prop.match(/(\w+)\s*=\s*([\d\.]+)/);
        if (propMatch && propMatch[1] !== "Shells") {
          result[componentName].metadata.config[propMatch[1]] = parseFloat(propMatch[2]);
        }
      }
      
      // Extract Shells section
      const shellsStart = configContent.indexOf("Shells = {");
      if (shellsStart !== -1) {
        // Initialize Shells object
        result[componentName].metadata.config.Shells = {};
        
        // Find the end of the Shells section
        const shellsContentStart = shellsStart + "Shells = {".length;
        let shellsBraceCount = 1;
        let shellsEnd = shellsContentStart;
        
        for (let i = shellsContentStart; i < configContent.length; i++) {
          if (configContent[i] === '{') shellsBraceCount++;
          if (configContent[i] === '}') shellsBraceCount--;
          
          if (shellsBraceCount === 0) {
            shellsEnd = i;
            break;
          }
        }
        
        const shellsContent = configContent.substring(shellsContentStart, shellsEnd);
        
        // Process each shell type
        // This is a key part - we'll look for patterns like "TYPE = { ... }"
        let currentShellIndex = 0;
        
        while (true) {
          // Find the next shell type
          const shellTypeMatch = shellsContent.substring(currentShellIndex).match(/(\w+)\s*=\s*{/);
          if (!shellTypeMatch) break;
          
          const shellType = shellTypeMatch[1];
          console.log(`  Found shell type: ${shellType}`);
          
          // Move past the shell type name
          currentShellIndex += shellTypeMatch.index + shellTypeMatch[0].length;
          
          // Find where this shell type ends
          let shellBraceCount = 1;
          let shellEnd = currentShellIndex;
          
          for (let i = currentShellIndex; i < shellsContent.length; i++) {
            if (shellsContent[i] === '{') shellBraceCount++;
            if (shellsContent[i] === '}') shellBraceCount--;
            
            if (shellBraceCount === 0) {
              shellEnd = i;
              break;
            }
          }
          
          const shellPropsContent = shellsContent.substring(currentShellIndex, shellEnd);
          currentShellIndex = shellEnd + 1;
          
          // Create shell type entry
          result[componentName].metadata.config.Shells[shellType] = {};
          
          // Process shell properties
          // Numeric properties
          const shellNumMatches = shellPropsContent.matchAll(/(\w+)\s*=\s*([\d\.]+)/g);
          for (const match of shellNumMatches) {
            result[componentName].metadata.config.Shells[shellType][match[1]] = parseFloat(match[2]);
          }
          
          // String properties
          const shellStrMatches = shellPropsContent.matchAll(/(\w+)\s*=\s*"([^"]+)"/g);
          for (const match of shellStrMatches) {
            result[componentName].metadata.config.Shells[shellType][match[1]] = match[2];
          }
          
          // Boolean properties
          if (shellPropsContent.includes("HEATFS = true")) {
            result[componentName].metadata.config.Shells[shellType].HEATFS = true;
          }
        }
      }
    }
  }
  
  return result;
}

/**
 * Main function to convert Lua file to JSON
 */
function convertLuaToJson() {
  // Get command line arguments
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.error('Usage: node robust-lua-parser.js <input_lua_file> <output_json_file>');
    process.exit(1);
  }
  
  const inputFile = args[0];
  const outputFile = args[1];
  
  console.log(`Converting ${inputFile} to ${outputFile}...`);
  
  try {
    // Read the input file
    if (!fs.existsSync(inputFile)) {
      console.error(`Input file not found: ${inputFile}`);
      process.exit(1);
    }
    
    const luaContent = fs.readFileSync(inputFile, 'utf8');
    
    // Parse the Lua content
    const parsedData = parseLuaFile(luaContent);
    
    // Create the output JSON
    const outputData = {
      items: parsedData,
      count: Object.keys(parsedData).length,
      lastUpdated: new Date().toISOString()
    };
    
    // Create directories if they don't exist
    const outputDir = path.dirname(outputFile);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Write the output file
    fs.writeFileSync(outputFile, JSON.stringify(outputData, null, 2), 'utf8');
    
    // Also write a debug version with extra spacing for readability
    const debugOutputFile = outputFile.replace('.json', '-debug.json');
    fs.writeFileSync(debugOutputFile, JSON.stringify(outputData, null, 4), 'utf8');
    
    console.log(`Successfully converted ${inputFile} to ${outputFile}`);
    console.log(`Debug version saved as ${debugOutputFile}`);
    console.log(`Total items: ${outputData.count}`);
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Run the conversion
convertLuaToJson();