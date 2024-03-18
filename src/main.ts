import {
	App,
	MarkdownView,
	Modal,
	Notice,
	Plugin,
	Setting,
	TFolder,
} from "obsidian";

// @ts-ignore
import EncryptWorker from "./encrypt.worker";

async function encryptionByCallingWorker(
	worker: Worker,
	app: App,
	filePath: string,
	password: string
) {
	new Notice(`Encrypting ${filePath}`);
	const input = await app.vault.adapter.readBinary(filePath);
	const channel = new MessageChannel();
	worker.postMessage(
		{
			action: "encrypt",
			input: input,
			password: password,
		},
		[channel.port1, input]
	);

	channel.port2.onmessage = async (event) => {
		const { output } = event.data as { output: ArrayBuffer };
		await app.vault.adapter.writeBinary(filePath + ".bin", output);
		new Notice(`Finish encrypting ${filePath}`);
	};
}

async function decryptionByCallingWorker(
	worker: Worker,
	app: App,
	filePath: string,
	password: string
) {
	new Notice(`Decrypting ${filePath}`);
	const input = await app.vault.adapter.readBinary(filePath);
	const channel = new MessageChannel();
	worker.postMessage(
		{
			action: "decrypt",
			input: input,
			password: password,
		},
		[channel.port1, input]
	);

	channel.port2.onmessage = async (event) => {
		const { output, status } = event.data as {
			output?: ArrayBuffer;
			status: "ok" | "error";
		};

		if (status === "error") {
			//
			new Notice(`Fail to decrypt.`);
			return;
		}

		const origFilePath = filePath.replace(/\.bin$/g, "");
		const origFilePathExt = origFilePath.split(".").pop();
		const newFileName = `${origFilePath.substring(
			0,
			origFilePath.length - origFilePathExt!.length - 1
		)}.dec.${origFilePathExt}`;
		if (await app.vault.adapter.exists(newFileName)) {
			// stop working!
			new Notice(`${newFileName} already exists, not overwriting.`);
			return;
		}
		await app.vault.adapter.writeBinary(newFileName, output!);
		new Notice(`Finish decrypting ${filePath}`);
	};
}

export default class CryptItPlugin extends Plugin {
	worker!: Worker;

	async onload() {
		this.worker = new (EncryptWorker as any)() as Worker;

		this.addCommand({
			id: "crypt-the-current-loading-file",
			name: "Crypt the current loading file",
			checkCallback: (checking: boolean) => {
				// Conditions to check
				const markdownView =
					this.app.workspace.getActiveViewOfType(MarkdownView);
				if (markdownView) {
					// If checking is true, we're simply "checking" if the command can be run.
					// If checking is false, then we want to actually perform the operation.
					if (!checking) {
						const filePath = markdownView.file!.path;
						new AskingPasswordModal(this.app, filePath, (result) => {
							encryptionByCallingWorker(
								this.worker,
								this.app,
								filePath,
								result
							);
						}).open();
					}

					// This command will only show up in Command Palette when the check function returns true
					return true;
				}
				return false; // not available outside markdown view
			},
		});

		// encryption
		this.registerEvent(
			this.app.workspace.on("file-menu", (menu, file) => {
				if (file instanceof TFolder) {
					// folder not supported yet
					return;
				}

				if (file.path.endsWith(".bin")) {
					// only show for not .bin
					return;
				}

				menu.addItem((item) => {
					item
						.setTitle("Generate encrypted version!")
						.setIcon("lock")
						.onClick(async () => {
							const filePath = file.path;
							new AskingPasswordModal(this.app, filePath, (result) => {
								encryptionByCallingWorker(
									this.worker,
									this.app,
									filePath,
									result
								);
							}).open();
						});
				});
			})
		);

		// decryption
		this.registerEvent(
			this.app.workspace.on("file-menu", (menu, file) => {
				if (file instanceof TFolder) {
					// folder not supported yet
					return;
				}

				if (!file.path.endsWith(".bin")) {
					// only show for enc
					return;
				}

				menu.addItem((item) => {
					item
						.setTitle("Try to decrypt this file!")
						.setIcon("key-square")
						.onClick(async () => {
							const filePath = file.path;
							new AskingPasswordModal(this.app, filePath, (result) => {
								decryptionByCallingWorker(
									this.worker,
									this.app,
									filePath,
									result
								);
							}).open();
						});
				});
			})
		);

		// this.app.workspace.on("files-menu", (menu, files) => {
		// 	// multi selection not supported yet
		// });

		this.registerEvent(
			this.app.workspace.on("editor-menu", (menu, editor, view) => {
				menu.addItem((item) => {
					item
						.setTitle("Generate encrypted version")
						.setIcon("lock")
						.onClick(async () => {
							const filePath = (view as MarkdownView)!.file!.path as string;

							if (filePath.endsWith(".bin")) {
								// only show for not .bin
								return;
							}

							new AskingPasswordModal(this.app, filePath, (result) => {
								encryptionByCallingWorker(
									this.worker,
									this.app,
									filePath,
									result
								);
							}).open();
						});
				});
			})
		);
	}

	onunload() {}
}

class AskingPasswordModal extends Modal {
	password: string;
	onSubmit: (result: string) => void;
	constructor(app: App, filePath: string, onSubmit: (result: string) => void) {
		super(app);
		this.onSubmit = onSubmit;
		this.password = "";
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.createEl("h1", { text: "What's your password for this file?" });

		new Setting(contentEl).setName("Password").addText((text) =>
			text.onChange((value) => {
				this.password = value;
			})
		);

		new Setting(contentEl).addButton((btn) =>
			btn
				.setButtonText("Submit")
				.setCta()
				.onClick(() => {
					this.close();
					this.onSubmit(this.password); // no await here
				})
		);
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}
