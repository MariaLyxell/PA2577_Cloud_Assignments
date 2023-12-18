const emptyLine = /^\s*$/;
const oneLineComment = /\/\/.*/;
const oneLineMultiLineComment = /\/\*.*?\*\//; 
const openMultiLineComment = /\/\*+[^\*\/]*$/;
const closeMultiLineComment = /^[\*\/]*\*+\//;

const SourceLine = require('./SourceLine');
const FileStorage = require('./FileStorage');
const Clone = require('./Clone');

const DEFAULT_CHUNKSIZE=5;

class CloneDetector {
    #myChunkSize = process.env.CHUNKSIZE || DEFAULT_CHUNKSIZE;
    #myFileStore = FileStorage.getInstance();

    constructor() {
    }

    // Private Methods
    // --------------------
    #filterLines(file) {
        let lines = file.contents.split('\n');
        let inMultiLineComment = false;
        file.lines=[];

        for (let i = 0; i < lines.length; i++) {
            let line = lines[i];

            if ( inMultiLineComment ) {
                if ( -1 != line.search(closeMultiLineComment) ) {
                    line = line.replace(closeMultiLineComment, '');
                    inMultiLineComment = false;
                } else {
                    line = '';
                }
            }

            line = line.replace(emptyLine, '');
            line = line.replace(oneLineComment, '');
            line = line.replace(oneLineMultiLineComment, '');
            
            if ( -1 != line.search(openMultiLineComment) ) {
                line = line.replace(openMultiLineComment, '');
                inMultiLineComment = true;
            }

            file.lines.push( new SourceLine(i+1, line.trim()) );
        }
       
        return file;
    }

    #getContentLines(file) {
        return file.lines.filter( line => line.hasContent() );        
    }


    #chunkify(file) {
        let chunkSize = this.#myChunkSize;
        let lines = this.#getContentLines(file);
        file.chunks=[];

        for (let i = 0; i <= lines.length-chunkSize; i++) {
            let chunk = lines.slice(i, i+chunkSize);
            file.chunks.push(chunk);
        }
        return file;
    }
    
    #chunkMatch(first, second) {
        let match = true;

        if (first.length != second.length) { match = false; }
        for (let idx=0; idx < first.length; idx++) {
            if (!(first[idx]).equals(second[idx])) { match = false; }
        }

        return match;
    }

    #filterCloneCandidates(file, compareFile) {
        // TODO
        var newInstances = [];

        // For each chunk in file.chunks, find all #chunkMatch() in compareFile.chunk
        for (let i=0; i < file.chunks.length; i++)
        {
            var chunk = file.chunks[i];
            for (let j=0; j < compareFile.chunks.length; j++)
            {
                var compChunk = compareFile.chunks[j];

                if (this.#chunkMatch(chunk, compChunk)) 
                {
                    // For each matching chunk, create a new Clone.
                    newInstances.push(new Clone(file.name, compareFile.name, chunk, compChunk));
                }
            }
        }

        file.instances = file.instances || [];     
        // Store the resulting (flat) array in file.instances.   
        file.instances = file.instances.concat(newInstances);

        // Return: file, including file.instances which is an array of Clone objects (or an empty array).
        return file;
    }
     
    #expandCloneCandidates(file) {
        // TODO
        var expandedClones = [];        
        let included = [];

        // For each Clone in file.instances, try to expand it with every other Clone
        for (let i=0; i < file.instances.length; i++)
        {
            var expanded = false;
            var clone = file.instances[i];

            // For every new element, check if it overlaps any element in the accumulator.
            // If it does, expand the element in the accumulator. If it doesn't, add it to the accumulator.
            if (included.find(function(element){ return element.equalsTarget(clone);}))
            {
                continue;
            }
            for (let j=i+1; j < file.instances.length; j++)
            {
                let otherClone = file.instances[j];
                // (using Clone::maybeExpandWith(), which returns true if it could expand)
                if (clone.maybeExpandWith(otherClone))
                {
                    expandedClones.push(clone);
                    included.push(otherClone);
                    expanded=true;
                }
            }
            if (!expanded)
            {
                expandedClones.push(clone);
            }
        }


        expandedClones.sort(function(a, b) { return ((b.sourceEnd-b.sourceStart)-(a.sourceEnd-a.sourceStart))})
        var uniqueExpandedClones = [];

        for (let i=0; i < expandedClones.length; i++)
        {
            var clone = expandedClones[i];

            if (uniqueExpandedClones.length == 0)
            {
                uniqueExpandedClones.push(clone);
            }
            else
            {
                var found = false;
                for (let j=0; j < uniqueExpandedClones.length; j++)
                {
                    // check if clone already exsists within the array of expanded clones
                    if (parseInt(expandedClones[i].sourceStart) >= parseInt(uniqueExpandedClones[j].sourceStart) &&
                        parseInt(expandedClones[i].sourceEnd) <= parseInt(uniqueExpandedClones[j].sourceEnd) && 
                        parseInt(expandedClones[i].targets[0].startLine) == parseInt(uniqueExpandedClones[j].targets[0].startLine) &&
                        expandedClones[i].targets[0].name == uniqueExpandedClones[j].targets[0].name)
                    {
                        found = true;
                        break;
                    }
                }
                if (!found)
                {
                    // console.log("Found one unique... \n%s", clone);
                    uniqueExpandedClones.push(clone);
                }
            }
        }

        // Return: file, with file.instances only including Clones that have been expanded as much as they can,
        //         and not any of the Clones used during that expansion.
        file.instances = uniqueExpandedClones;
        return file;
    }
    
    #consolidateClones(file) {
        // TODO
        // For each clone, accumulate it into an array if it is new
        let accumulator = file.instances.reduce(function(a, c, i) {
            if (i == 0)
            {
                a.push(c);
            }
            else
            {
                let y = a.find(function(x) { if (x.equals(c)) {return x;} else {return undefined;}} );
                if (y != undefined) 
                {
                    // If it isn't new, update the existing clone to include this one too
                    // using Clone::addTarget()
                    y.addTarget(c)
                    
                }
                else
                {
                    a.push(c);
                }
            }
            return a;
        }, []);

        // Return: file, with file.instances containing unique Clone objects that may contain several targets
        file.instances = accumulator;

        return file;
    }
    

    // Public Processing Steps
    // --------------------
    preprocess(file) {
        return new Promise( (resolve, reject) => {
            if (!file.name.endsWith('.java') ) {
                reject(file.name + ' is not a java file. Discarding.');
            } else if(this.#myFileStore.isFileProcessed(file.name)) {
                reject(file.name + ' has already been processed.');
            } else {
                resolve(file);
            }
        });
    }

    transform(file) {
        file = this.#filterLines(file);
        file = this.#chunkify(file);
        return file;
    }

    matchDetect(file) {
        let allFiles = this.#myFileStore.getAllFiles();
        file.instances = file.instances || [];
        for (let f of allFiles) {
            // TODO implement these methods (or re-write the function matchDetect() to your own liking)
            // 
            // Overall process:
            // 
            // 1. Find all equal chunks in file and f. Represent each matching pair as a Clone.
            //
            // 2. For each Clone with endLine=x, merge it with Clone with endLine-1=x
            //    remove the now redundant clone, rinse & repeat.
            //    note that you may end up with several "root" Clones for each processed file f
            //    if there are more than one clone between the file f and the current
            //
            // 3. If the same clone is found in several places, consolidate them into one Clone.
            //

            file = this.#filterCloneCandidates(file, f); 
            file = this.#expandCloneCandidates(file);
            file = this.#consolidateClones(file); 
        }

        return file;
    }

    pruneFile(file) {
        delete file.lines;
        delete file.instances;
        return file;
    }
    
    storeFile(file) {
        this.#myFileStore.storeFile(this.pruneFile(file));
        return file;
    }

    get numberOfProcessedFiles() { return this.#myFileStore.numberOfFiles; }
}

module.exports = CloneDetector;
