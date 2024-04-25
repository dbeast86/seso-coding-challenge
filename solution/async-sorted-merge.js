"use strict";


// The LogQueue proactively queues up log entries for a given LogSource, with an adjustable capacity
class LogQueue {
  logs = [];
  drained = false;
  MAX_CAPACITY = 20;
  constructor(logSource) {
    this.logSource = logSource;
    // `currentEntry` will return the next entry in the queue and also handle refilling the queue
    this.currentEntry = async() => {
      if (this.logs.length > 0) {
        const logEntry = this.logs[0];
        if (this.logs.length < this.MAX_CAPACITY) {
          await this.fill();
        }
        const currentEntry = await logEntry;
        if(!currentEntry){
          this.drained = true;
        }
        return currentEntry;
      } else if(!this.drained) {
        await this.fill();
        return this.currentEntry();
      }else{
        return this.drained;
      }
    }
    // `shift` handles popping an entry from the queue
    this.shift = () => {
      return this.logs.shift();
    }
    // `fill` handles refilling the queue
    this.fill = async () => {
      while (!this.drained && this.logs.length < this.MAX_CAPACITY) {
        this.logs.push(this.logSource.popAsync());
      }
    }
    // Load up the queue on instantiation
    this.fill();
  }
}

// Could not get this working..
// The idea was to batch up log entries for each LogSource in a queue, and perform the same algorithm
// from my sync solution, which was 
//  1. sort all LogSources in chronological order by their current log entry
//  2. loop through the earliest LogSource until it no longer had the earliest log entry
//  3. Repeat steps 1 and 2
module.exports.logAsync = async function(logSources, printer){
  return new Promise(async (resolve, reject) => {
    if (!Array.isArray(logSources) || logSources.length < 1) {
      reject("Invalid log sources or no log sources provided.");
    }
    const logIterators = logSources.map((logSource, i) => new LogQueue(logSource, i));

    while (logIterators.length > 0) {
      await Promise.all(logIterators.map(li => li.currentEntry()));
      // TODO handle sorting. The below won't work with async retrieval of entries
      logIterators.sort((a, b) => a.currentEntry().date - b.currentEntry().date);

      let currentLogIterator = logIterators[0];
      let nextLogIterator = logIterators.length > 1 ? logIterators[1] : null;

      let currentLogIteratorEntry = async() => await currentLogIterator.currentEntry();
      let nextLogIteratorEntry = await nextLogIterator?.currentEntry();
   
      while (!(currentLogIterator.logs.length > 0) &&
        (!nextLogIterator || (await currentLogIteratorEntry()).date <= nextLogIteratorEntry?.date)) {
        printer.print(await currentLogIteratorEntry());
        currentLogIterator.shift();
      }

      if (currentLogIterator.logs.length == 0) {
        logIterators.shift();
      }
    }

    printer.done();
    resolve(console.log("Async sort complete."));
  });
}

// Print all entries, across all of the *async* sources, in chronological order.
// This solution ported over the logic from the sync solution, works, but is slow.
module.exports = async (logSources, printer) => {
  return new Promise(async (resolve, reject) => {
    if (!Array.isArray(logSources) || logSources.length < 1) {
      reject("Invalid log sources or no log sources provided.");
    }
    const logSourcesWithEntry = await Promise.all(
      logSources.map(
        async logSource => ({ logSource, currentEntry: await logSource.popAsync() }))
    );

    while (logSourcesWithEntry.length > 0) {
      // Sort all log sources by their current entry
      logSourcesWithEntry.sort((a, b) => a.currentEntry.date - b.currentEntry.date);

      let currentLogSource = logSourcesWithEntry[0];
      let nextLogSource = logSourcesWithEntry.length > 1 ? logSourcesWithEntry[1] : null;

      // Loop through the log source with the earliest current entry until it is no longer the earliest
      while (currentLogSource.currentEntry &&
        (!nextLogSource || currentLogSource.currentEntry.date <= nextLogSource.currentEntry.date)) {
        printer.print(currentLogSource.currentEntry);
        currentLogSource.currentEntry = await currentLogSource.logSource.popAsync()
      }

      // if the current log source has no more entries, remove it from the array
      if (!currentLogSource.currentEntry) {
        logSourcesWithEntry.shift();
      }
    }

    printer.done();
    resolve(console.log("Async sort complete."));
  });
};

