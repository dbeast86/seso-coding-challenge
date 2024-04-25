"use strict";

// Print all entries, across all of the sources, in chronological order.
module.exports = (logSources, printer) => {
  if(!Array.isArray(logSources) || logSources.length < 1){
    return;
  }
  
  // Extract first entry for all log sources into array
  const logSourcesWithEntry = logSources.map(
    logSource => ({ currentEntry: logSource.pop(), source: logSource }));

  while(logSourcesWithEntry.length > 0){
    // Sort all log sources by their current entry
    logSourcesWithEntry.sort((a, b) => a.currentEntry.date - b.currentEntry.date);

    let currentLogSource = logSourcesWithEntry[0];
    let nextLogSource = logSourcesWithEntry.length > 1 ? logSourcesWithEntry[1] : null;
    
    // Loop through the log source with the earliest current entry until it is no longer the earliest
    while(currentLogSource.currentEntry && 
      (!nextLogSource || currentLogSource.currentEntry.date <= nextLogSource.currentEntry.date)){
      printer.print(currentLogSource.currentEntry);
      currentLogSource.currentEntry = currentLogSource.source.pop()
    }

    // if the current log source has no more entries, remove it from the array
    if(!currentLogSource.currentEntry){
      logSourcesWithEntry.shift();
    }
  }
  printer.done();
  return console.log("Sync sort complete.");
};