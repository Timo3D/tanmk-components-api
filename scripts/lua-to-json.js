// scripts/lua-to-json.js
const fs = require('fs');
const path = require('path');

/**
 * Convert a Lua file to JSON
 * @param {string} luaContent - Content of the Lua file
 * @returns {Object|null} Parsed object or null if parsing failed
 */
function parseLuaToJson(luaContent) {
  // Detect the file type based on content patterns
  const isGuns = luaContent.includes('GunWeight') || luaContent.includes('GunCaliber') || luaContent.includes('Shells');
  const isTurrets = luaContent.includes('TurretWeight') || luaContent.includes('VtTraverse') || luaContent.includes('HzTraverse');
  const isHulls = luaContent.includes('HullWeight') || luaContent.includes('TrackWidth') || luaContent.includes('SpringStiffness');
  
  console.log(`Detected type: ${isGuns ? 'guns' : (isTurrets ? 'turrets' : (isHulls ? 'hulls' : 'unknown'))}`);
  
  // Remove the 'return' at the beginning if present
  luaContent = luaContent.replace(/^return\s*{/, '{');
  
  // Parse based on the detected type
  let result = {};
  
  try {
    // Common patterns across all types
    const itemPattern = /\['([^']+)'\]\s*=\s*{id\s*=\s*(\d+),\s*metadata\s*=\s*{([^}]+)}/g;
    
    let match;
    while ((match = itemPattern.exec(luaContent)) !== null) {
      const itemName = match[1];
      const itemId = match[2];
      const metadataContent = match[3];
      
      // Initialize item
      result[itemName] = {
        id: itemId,
        metadata: {
          attributes: {},
          config: {}
        }
      };
      
      // Parse attributes if present
      const attributesMatch = metadataContent.match(/attributes\s*=\s*{([^}]+)}/);
      if (attributesMatch) {
        const attributesContent = attributesMatch[1];
        
        // Handle CFrame
        const cfMatch = attributesContent.match(/CF\s*=\s*CFrame\.new\(([^)]+)\)/);
        if (cfMatch) {
          const values = cfMatch[1].split(',').map(v => parseFloat(v.trim()));
          result[itemName].metadata.attributes.CF = {
            position: [values[0], values[1], values[2]],
            orientation: values.length > 3 ? 
              [values[3], values[4], values[5], values[6], values[7], values[8], values[9] || 0, values[10] || 0, values[11] || 1] : 
              [1, 0, 0, 0, 1, 0, 0, 0, 1]
          };
        }
        
        // Handle Vector2
        const vector2Matches = attributesContent.matchAll(/(\w+)\s*=\s*Vector2\.new\(([^)]+)\)/g);
        for (const vMatch of vector2Matches) {
          const propName = vMatch[1];
          const values = vMatch[2].split(',').map(v => parseFloat(v.trim()));
          result[itemName].metadata.attributes[propName] = {
            x: values[0],
            y: values[1]
          };
        }
        
        // Handle string properties
        const stringMatches = attributesContent.matchAll(/(\w+)\s*=\s*"([^"]+)"/g);
        for (const sMatch of stringMatches) {
          result[itemName].metadata.attributes[sMatch[1]] = sMatch[2];
        }
        
        // Handle numeric properties
        const numMatches = attributesContent.matchAll(/(\w+)\s*=\s*(\d+(?:\.\d+)?)/g);
        for (const nMatch of numMatches) {
          // Skip properties already processed (like CF, Vector2, etc.)
          if (!result[itemName].metadata.attributes[nMatch[1]]) {
            result[itemName].metadata.attributes[nMatch[1]] = parseFloat(nMatch[2]);
          }
        }
        
        // Handle boolean properties
        const boolMatches = attributesContent.matchAll(/(\w+)\s*=\s*(true|false)/g);
        for (const bMatch of boolMatches) {
          result[itemName].metadata.attributes[bMatch[1]] = bMatch[2] === 'true';
        }
      }
      
      // Parse config if present
      const configMatch = metadataContent.match(/config\s*=\s*{([^}]+)}/);
      if (configMatch) {
        const configContent = configMatch[1];
        
        // Handle Vector3 properties in config
        const vector3Matches = configContent.matchAll(/(\w+)\s*=\s*Vector3\.new\(([^)]+)\)/g);
        for (const vMatch of vector3Matches) {
          const propName = vMatch[1];
          const values = vMatch[2].split(',').map(v => parseFloat(v.trim()));
          result[itemName].metadata.config[propName] = {
            x: values[0],
            y: values[1],
            z: values[2]
          };
        }
        
        // Handle numeric properties in config
        const configNumMatches = configContent.matchAll(/(\w+)\s*=\s*(\d+(?:\.\d+)?)/g);
        for (const nMatch of configNumMatches) {
          // Skip properties already processed
          if (!result[itemName].metadata.config[nMatch[1]]) {
            result[itemName].metadata.config[nMatch[1]] = parseFloat(nMatch[2]);
          }
        }
        
        // Handle string properties in config
        const configStringMatches = configContent.matchAll(/(\w+)\s*=\s*"([^"]+)"/g);
        for (const sMatch of configStringMatches) {
          result[itemName].metadata.config[sMatch[1]] = sMatch[2];
        }
        
        // Handle boolean properties in config
        const configBoolMatches = configContent.matchAll(/(\w+)\s*=\s*(true|false)/g);
        for (const bMatch of configBoolMatches) {
          result[itemName].metadata.config[bMatch[1]] = bMatch[2] === 'true';
        }
        
        // Special handling for shells in guns
        if (isGuns) {
          const shellsMatch = configContent.match(/Shells\s*=\s*{([^}]+)}/);
          if (shellsMatch) {
            const shellsContent = shellsMatch[1];
            result[itemName].metadata.config.Shells = {};
            
            // Extract shell types
            const shellTypePattern = /(\w+)\s*=\s*{([^}]+)}/g;
            let shellTypeMatch;
            while ((shellTypeMatch = shellTypePattern.exec(shellsContent)) !== null) {
              const shellType = shellTypeMatch[1];
              const shellPropsContent = shellTypeMatch[2];
              
              result[itemName].metadata.config.Shells[shellType] = {};
              
              // Extract shell properties
              const shellPropNumMatches = shellPropsContent.matchAll(/(\w+)\s*=\s*(\d+(?:\.\d+)?)/g);
              for (const propMatch of shellPropNumMatches) {
                result[itemName].metadata.config.Shells[shellType][propMatch[1]] = parseFloat(propMatch[2]);
              }
              
              // Extract shell string properties
              const shellPropStringMatches = shellPropsContent.matchAll(/(\w+)\s*=\s*"([^"]+)"/g);
              for (const propMatch of shellPropStringMatches) {
                result[itemName].metadata.config.Shells[shellType][propMatch[1]] = propMatch[2];
              }
              
              // Extract shell boolean properties
              const shellPropBoolMatches = shellPropsContent.matchAll(/(\w+)\s*=\s*(true|false)/g);
              for (const propMatch of shellPropBoolMatches) {
                result[itemName].metadata.config.Shells[shellType][propMatch[1]] = propMatch[2] === 'true';
              }
            }
          }
        }
      }
      
      // Parse crew if present
      const crewMatch = metadataContent.match(/crew\s*=\s*{([^}]+)}/);
      if (crewMatch) {
        const crewContent = crewMatch[1];
        result[itemName].metadata.crew = [];
        
        // Extract crew member names
        const crewNameMatches = crewContent.matchAll(/"([^"]+)"/g);
        for (const nameMatch of crewNameMatches) {
          result[itemName].metadata.crew.push(nameMatch[1]);
        }
      }
      
      // Parse TD attributes if present (for turrets)
      const tdAttributesMatch = metadataContent.match(/tdAttributes\s*=\s*{([^}]+)}/);
      if (tdAttributesMatch) {
        const tdAttributesContent = tdAttributesMatch[1];
        result[itemName].metadata.tdAttributes = {};
        
        // Handle Vector2 in TD attributes
        const tdVector2Matches = tdAttributesContent.matchAll(/(\w+)\s*=\s*Vector2\.new\(([^)]+)\)/g);
        for (const vMatch of tdVector2Matches) {
          const propName = vMatch[1];
          const values = vMatch[2].split(',').map(v => parseFloat(v.trim()));
          result[itemName].metadata.tdAttributes[propName] = {
            x: values[0],
            y: values[1]
          };
        }
        
        // Handle string properties in TD attributes
        const tdStringMatches = tdAttributesContent.matchAll(/(\w+)\s*=\s*"([^"]+)"/g);
        for (const sMatch of tdStringMatches) {
          result[itemName].metadata.tdAttributes[sMatch[1]] = sMatch[2];
        }
        
        // Handle numeric properties in TD attributes
        const tdNumMatches = tdAttributesContent.matchAll(/(\w+)\s*=\s*(\d+(?:\.\d+)?)/g);
        for (const nMatch of tdNumMatches) {
          // Skip properties already processed
          if (!result[itemName].metadata.tdAttributes[nMatch[1]]) {
            result[itemName].metadata.tdAttributes[nMatch[1]] = parseFloat(nMatch[2]);
          }
        }
        
        // Handle boolean properties in TD attributes
        const tdBoolMatches = tdAttributesContent.matchAll(/(\w+)\s*=\s*(true|false)/g);
        for (const bMatch of tdBoolMatches) {
          result[itemName].metadata.tdAttributes[bMatch[1]] = bMatch[2] === 'true';
        }
      }
      
      // Parse ammoMass if present
      const ammoMassMatch = metadataContent.match(/ammoMass\s*=\s*(\d+(?:\.\d+)?)/);
      if (ammoMassMatch) {
        result[itemName].metadata.ammoMass = parseFloat(ammoMassMatch[1]);
      }
    }
    
    return result;
  } catch (error) {
    console.error('Error parsing Lua content:', error);
    return null;
  }
}

/**
 * Main function to convert Lua file to JSON
 */
function convertLuaToJson() {
  // Get command line arguments
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.error('Usage: node lua-to-json.js <input_lua_file> <output_json_file>');
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
    const parsedData = parseLuaToJson(luaContent);
    
    if (!parsedData) {
      console.error('Failed to parse Lua content');
      process.exit(1);
    }
    
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
    
    console.log(`Successfully converted ${inputFile} to ${outputFile}`);
    console.log(`Total items: ${outputData.count}`);
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Run the conversion
convertLuaToJson();