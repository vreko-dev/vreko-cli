/**
 * ACP Content-Length Framing
 *
 * Implements Content-Length framing per ACP v1.1 spec.
 * Format: Content-Length: <length>\r\n\r\n<json-payload>
 *
 * @module acp/transport/framing
 */

// =============================================================================
// TYPES
// =============================================================================

export interface FramedMessage {
	contentLength: number;
	payload: string;
}

// =============================================================================
// CONTENT-LENGTH FRAMER
// =============================================================================

/**
 * ContentLengthFramer handles the Content-Length framing protocol
 * used by ACP for stdin/stdout communication.
 *
 * @example
 * ```typescript
 * const framer = new ContentLengthFramer();
 *
 * // Feed incoming data
 * const messages = framer.feed(incomingData);
 * for (const { payload } of messages) {
 *   const json = JSON.parse(payload);
 *   // Handle message
 * }
 *
 * // Frame outgoing data
 * const framed = ContentLengthFramer.frame(JSON.stringify(response));
 * process.stdout.write(framed);
 * ```
 */
export class ContentLengthFramer {
	private buffer = "";

	/**
	 * Feed raw data into the framer.
	 * Returns complete messages as they become available.
	 */
	feed(data: string): FramedMessage[] {
		this.buffer += data;
		const messages: FramedMessage[] = [];

		while (true) {
			const message = this.tryExtractMessage();
			if (!message) {
				break;
			}
			messages.push(message);
		}

		return messages;
	}

	/**
	 * Try to extract a complete message from the buffer.
	 * Returns null if no complete message is available.
	 */
	private tryExtractMessage(): FramedMessage | null {
		// Look for Content-Length header
		const headerEnd = this.buffer.indexOf("\r\n\r\n");
		if (headerEnd === -1) {
			return null;
		}

		const header = this.buffer.substring(0, headerEnd);
		const match = header.match(/Content-Length:\s*(\d+)/i);
		if (!match) {
			// Invalid header, skip to next potential message
			this.buffer = this.buffer.substring(headerEnd + 4);
			return null;
		}

		const contentLength = Number.parseInt(match[1], 10);
		const payloadStart = headerEnd + 4;

		// Check if we have the full payload (using byte length for accuracy)
		const bufferBytes = Buffer.byteLength(this.buffer.substring(payloadStart), "utf8");
		if (bufferBytes < contentLength) {
			return null;
		}

		// Extract payload by byte length (handles unicode correctly)
		const payloadBuffer = Buffer.from(this.buffer.substring(payloadStart), "utf8");
		const payload = payloadBuffer.subarray(0, contentLength).toString("utf8");

		// Calculate actual character offset for the payload end
		const actualPayloadChars = Buffer.from(payload, "utf8").toString("utf8").length;
		this.buffer = this.buffer.substring(payloadStart + actualPayloadChars);

		return { contentLength, payload };
	}

	/**
	 * Reset the buffer (useful for error recovery).
	 */
	reset(): void {
		this.buffer = "";
	}

	/**
	 * Get current buffer size (for debugging).
	 */
	get bufferSize(): number {
		return this.buffer.length;
	}

	/**
	 * Frame a message for sending.
	 *
	 * @param payload - The JSON payload to frame
	 * @returns The framed message ready for transport
	 */
	static frame(payload: string): string {
		const bytes = Buffer.byteLength(payload, "utf8");
		return `Content-Length: ${bytes}\r\n\r\n${payload}`;
	}
}
