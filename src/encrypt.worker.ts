import { Cipher } from "@fyears/rclone-crypt";

const ctx: WorkerGlobalScope = self as any;

async function cryptSingleFile(input: ArrayBuffer, password: string) {
	const c = new Cipher();
	await c.key(password, "");
	const res = await c.encryptData(new Uint8Array(input), undefined);
	return res;
}

async function decryptSingleFile(input: ArrayBuffer, password: string) {
	const c = new Cipher();
	await c.key(password, "");
	try {
		const res = await c.decryptData(new Uint8Array(input));
		return res;
	} catch (error) {
		console.log(error);
		throw new Error("Could not decrypt message");
	}
}

ctx.addEventListener("message", async (event: any) => {
	const port: MessagePort = event.ports[0];
	const { input, password, action } = event.data as {
		input: ArrayBuffer;
		password: string;
		action: "encrypt" | "decrypt";
	};

	switch (action) {
		case "encrypt": {
			const output = await cryptSingleFile(input, password);
			port.postMessage(
				{
					output: output,
				},
				[output.buffer]
			);
			break;
		}
		case "decrypt": {
			try {
				const output = await decryptSingleFile(input, password);
				port.postMessage(
					{
						status: "ok",
						output: output,
					},
					[output.buffer]
				);
			} catch (error) {
				console.error(error);
				port.postMessage({
					status: "error",
				});
			}

			break;
		}
		default: {
			break;
		}
	}
});
