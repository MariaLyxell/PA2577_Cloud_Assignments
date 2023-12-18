class Clone {

    constructor(sourceName, targetName, sourceChunk, targetChunk) {
        this.sourceName = sourceName;
        this.sourceStart = sourceChunk[0].lineNumber;
        this.sourceEnd = sourceChunk[sourceChunk.length -1].lineNumber;
        this.sourceChunk = sourceChunk;

        this.targets = [{ name: targetName, startLine: targetChunk[0].lineNumber }];
    }

    equals(clone) {
        return this.sourceName == clone.sourceName &&
            this.sourceStart == clone.sourceStart &&
            this.sourceEnd == clone.sourceEnd;
    }

    // This may not be fully functional in the long run and needs more investegating,
    // however it prevents some losses of clones...  
    equalsTarget(clone) {
        return this.sourceName == clone.sourceName &&
            this.sourceStart == clone.sourceStart &&
            this.sourceEnd == clone.sourceEnd &&
            this.targets[0].startLine == clone.targets[0].startLine;
    }

    addTarget(clone) {
        this.targets = this.targets.concat(clone.targets);
    }

    isNext(clone) {
        return (this.sourceChunk[this.sourceChunk.length-1].lineNumber == 
                clone.sourceChunk[clone.sourceChunk.length-2].lineNumber);
    }

    // This may not be fully functional in the long run and needs more investegating,
    // however it prevents some losses of clones...  
    isNextTarget(clone) {
        if ((this.targets[0].name == clone.targets[0].name && ((clone.sourceStart-this.sourceStart) == (clone.targets[0].startLine-this.targets[0].startLine))))
        {
            return true;
        }
        return false;
    }

    maybeExpandWith(clone) {
        if (this.isNext(clone) && this.isNextTarget(clone)) {
            this.sourceChunk = [...new Set([...this.sourceChunk, ...clone.sourceChunk])];
            this.sourceEnd = this.sourceChunk[this.sourceChunk.length-1].lineNumber;
            //console.log('Expanded clone, now starting at', this.sourceStart, 'and ending at', this.sourceEnd);
            return true;
        } else {
            return false;
        }
    }
}

module.exports = Clone;
