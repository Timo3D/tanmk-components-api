// improved-lua-to-json.js
const fs = require('fs');
const path = require('path');

/**
 * Convert Lua gun data to JSON
 * @param {string} luaContent - Lua file content
 * @returns {Object} Parsed object
 */
function convertGunsToJson(luaContent) {
  console.log("Starting conversion of guns data...");
  
  // Remove the return statement at the beginning
  luaContent = luaContent.replace(/^return\s*{/, '{');
  luaContent = luaContent.replace(/};$/, '}');
  
  // Create result object to hold all guns
  const result = {};
  
  // Regular expression for gun entries
  // Capturing the name, id, and the entire metadata section
  const gunRegex = /\['([^']+)'\]\s*=\s*{id\s*=\s*(\d+),\s*metadata\s*=\s*{([\s\S]*?)}\}/g;
  
  let match;
  while ((match = gunRegex.exec(luaContent)) !== null) {
    const gunName = match[1];
    const gunId = match[2];
    const metadataContent = match[3];
    
    console.log(`Found gun: ${gunName}, ID: ${gunId}`);
    
    // Initialize the gun object
    result[gunName] = {
      id: gunId,
      metadata: {
        attributes: {},
        config: {}
      }
    };
    
    // Extract attributes section
    const attributesRegex = /attributes\s*=\s*{([\s\S]*?)},\s*config/;
    const attributesMatch = metadataContent.match(attributesRegex);
    
    if (attributesMatch) {
      const attributesContent = attributesMatch[1];
      console.log(`Found attributes for ${gunName}`);
      
      // Process CFrame
      const cfRegex = /CF\s*=\s*CFrame\.new\(([-\d\., ]+)\)/;
      const cfMatch = attributesContent.match(cfRegex);
      if (cfMatch) {
        const cfValues = cfMatch[1].split(',').map(v => parseFloat(v.trim()));
        result[gunName].metadata.attributes.CF = {
          position: [cfValues[0], cfValues[1], cfValues[2]],
          orientation: [
            cfValues[3] || 1, cfValues[4] || 0, cfValues[5] || 0,
            cfValues[6] || 0, cfValues[7] || 1, cfValues[8] || 0,
            cfValues[9] || 0, cfValues[10] || 0, cfValues[11] || 1
          ]
        };
      }
      
      // Process string attributes
      const stringRegex = /(\w+)\s*=\s*"([^"]+)"/g;
      let stringMatch;
      while ((stringMatch = stringRegex.exec(attributesContent)) !== null) {
        result[gunName].metadata.attributes[stringMatch[1]] = stringMatch[2];
      }
      
      // Process numeric attributes
      const numericRegex = /(\w+)\s*=\s*(\d+)/g;
      let numericMatch;
      while ((numericMatch = numericRegex.exec(attributesContent)) !== null) {
        // Skip if already processed as a different type
        if (!result[gunName].metadata.attributes[numericMatch[1]]) {
          result[gunName].metadata.attributes[numericMatch[1]] = parseInt(numericMatch[2]);
        }
      }
    } else {
      console.log(`No attributes found for ${gunName}`);
    }
    
    // Extract config section with modified regex to better capture all content
    const configRegex = /config\s*=\s*{([\s\S]*)}(?=\s*}$)/;
    const configMatch = metadataContent.match(configRegex);
    
    if (configMatch) {
      const configContent = configMatch[1];
      console.log(`Found config for ${gunName}`);
      
      // Process simple numeric properties in config
      const configNumRegex = /(\w+)\s*=\s*([\d\.]+),/g;
      let configNumMatch;
      while ((configNumMatch = configNumRegex.exec(configContent)) !== null) {
        const propName = configNumMatch[1];
        // Skip "Shells" which is processed separately
        if (propName !== "Shells") {
          result[gunName].metadata.config[propName] = parseFloat(configNumMatch[2]);
        }
      }
      
      // Process Shells section - new improved approach
      if (configContent.includes("Shells = {")) {
        result[gunName].metadata.config.Shells = {};
        
        // Find the Shells section start and end
        const shellsStart = configContent.indexOf("Shells = {") + "Shells = {".length;
        let bracketCount = 1;
        let shellsEnd = shellsStart;
        
        for (let i = shellsStart; i < configContent.length; i++) {
          if (configContent[i] === '{') bracketCount++;
          if (configContent[i] === '}') bracketCount--;
          
          if (bracketCount === 0) {
            shellsEnd = i;
            break;
          }
        }
        
        // Extract the complete Shells content
        const shellsContent = configContent.substring(shellsStart, shellsEnd);
        console.log(`Found shells content for ${gunName}`);
        
        // Process each shell type
        let currentIndex = 0;
        
        while (currentIndex < shellsContent.length) {
          // Find the next shell type
          const shellTypeMatch = shellsContent.substring(currentIndex).match(/^\s*(\w+)\s*=\s*{/);
          
          if (!shellTypeMatch) break;
          
          const shellType = shellTypeMatch[1];
          currentIndex += shellTypeMatch[0].length;
          
          // Find the end of this shell's properties
          let shellPropBracketCount = 1;
          let shellPropsEnd = currentIndex;
          
          for (let i = currentIndex; i < shellsContent.length; i++) {
            if (shellsContent[i] === '{') shellPropBracketCount++;
            if (shellsContent[i] === '}') shellPropBracketCount--;
            
            if (shellPropBracketCount === 0) {
              shellPropsEnd = i;
              break;
            }
          }
          
          // Extract shell properties
          const shellProps = shellsContent.substring(currentIndex, shellPropsEnd);
          currentIndex = shellPropsEnd + 1;
          
          // Initialize shell
          result[gunName].metadata.config.Shells[shellType] = {};
          
          // Process numeric shell properties
          const shellNumRegex = /(\w+)\s*=\s*([\d\.]+)/g;
          let shellNumMatch;
          while ((shellNumMatch = shellNumRegex.exec(shellProps)) !== null) {
            result[gunName].metadata.config.Shells[shellType][shellNumMatch[1]] = parseFloat(shellNumMatch[2]);
          }
          
          // Process string shell properties
          const shellStrRegex = /(\w+)\s*=\s*"([^"]+)"/g;
          let shellStrMatch;
          while ((shellStrMatch = shellStrRegex.exec(shellProps)) !== null) {
            result[gunName].metadata.config.Shells[shellType][shellStrMatch[1]] = shellStrMatch[2];
          }
          
          // Process boolean shell properties
          if (shellProps.includes("HEATFS = true")) {
            result[gunName].metadata.config.Shells[shellType].HEATFS = true;
          }
        }
      }
    } else {
      console.log(`No config found for ${gunName}`);
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
    console.error('Usage: node improved-lua-to-json.js <input_lua_file> <output_json_file>');
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
    
    // Determine file type based on content
    const isGuns = luaContent.includes('GunWeight') || luaContent.includes('GunCaliber');
    
    let parsedData;
    if (isGuns) {
      parsedData = convertGunsToJson(luaContent);
    } else {
      console.error('Unsupported file type. Currently only supporting guns data.');
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