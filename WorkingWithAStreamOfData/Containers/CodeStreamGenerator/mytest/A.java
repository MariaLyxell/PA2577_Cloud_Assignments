package org.conqat.engine.code_clones.index;
import org.conqat.lib.commons.digest.MD5Digest;
public class Chunk {
	private final String originId;
	private final MD5Digest chunkHash;
	private final int firstUnitIndex;
	private final int firstRawLineNumber;
	private final int lastRawLineNumber;
	private final int rawStartOffset;
	private final int rawEndOffset;
	private final int elementUnits;
	public Chunk(String originId, MD5Digest chunkHash, int firstUnitIndex,
			int firstRawLineNumber, int lastRawLineNumber, int rawStartOffset,
			int rawEndOffset) {
		this.originId = originId;
		this.chunkHash = chunkHash;
		this.firstUnitIndex = firstUnitIndex;
		this.firstRawLineNumber = firstRawLineNumber;
		this.lastRawLineNumber = lastRawLineNumber;
		this.rawStartOffset = rawStartOffset;
		this.rawEndOffset = rawEndOffset;
		this.elementUnits = -1;
	}