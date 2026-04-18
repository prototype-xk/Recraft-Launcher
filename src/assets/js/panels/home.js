/**
 * @author Luuxis
 * Luuxis License v1.0 (voir fichier LICENSE pour les détails en FR/EN)
 */

import { config, database, logger, changePanel, appdata, setStatus, pkg, popup } from '../utils.js'

const { Launch } = require('minecraft-java-core')
const { shell, ipcRenderer } = require('electron')
const fs = require('fs');
const path = require('path');

class Home {
    static id = "home";
    async init(config) {
        this.config = config;
        this.db = new database();
        this.news()
        this.socialLick()
        this.instancesSelect()
        document.querySelector('.settings-btn').addEventListener('click', e => changePanel('settings'))
        document.querySelector('.repair-btn').addEventListener('click', e => this.deleteModpack())
    }

    async news() {
        let newsElement = document.querySelector('.news-list');
        let news = await config.getNews(this.config).then(res => res).catch(err => false);
        if (news) {
            if (!news.length) {
                let blockNews = document.createElement('div');
                const date = this.getdate(new Date())
                blockNews.classList.add('news-block');
                blockNews.innerHTML = `
                    <div class="news-header">
                        <img class="server-status-icon" src="assets/images/icon/icon.png">
                        <div class="header-text">
                            <div class="title">Aucun news n'ai actuellement disponible.</div>
                        </div>
                        <div class="date">
                            <div class="day">${date.day}</div>
                            <div class="month">${date.month}</div>
                        </div>
                    </div>
                    <div class="news-content">
                        <div class="bbWrapper">
                            <p>Vous pourrez suivre ici toutes les news relative au serveur.</p>
                        </div>
                    </div>`
                newsElement.appendChild(blockNews);
            } else {
                for (let News of news) {
                    let date = this.getdate(News.publish_date)
                    let blockNews = document.createElement('div');
                    blockNews.classList.add('news-block');
                    blockNews.innerHTML = `
                        <div class="news-header">
                            <img class="server-status-icon" src="assets/images/icon/icon.png">
                            <div class="header-text">
                                <div class="title">${News.title}</div>
                            </div>
                            <div class="date">
                                <div class="day">${date.day}</div>
                                <div class="month">${date.month}</div>
                            </div>
                        </div>
                        <div class="news-content">
                            <div class="bbWrapper">
                                <p>${News.content.replace(/\n/g, '</br>')}</p>
                                <p class="news-author">Auteur - <span>${News.author}</span></p>
                            </div>
                        </div>`
                    newsElement.appendChild(blockNews);
                }
            }
        } else {
            let blockNews = document.createElement('div');
            const date = this.getdate(new Date())
            blockNews.classList.add('news-block');
            blockNews.innerHTML = `
                <div class="news-header">
                        <img class="server-status-icon" src="assets/images/icon/icon.png">
                        <div class="header-text">
                            <div class="title">Error.</div>
                        </div>
                        <div class="date">
                            <div class="day">${date.day}</div>
                            <div class="month">${date.month}</div>
                        </div>
                    </div>
                    <div class="news-content">
                        <div class="bbWrapper">
                            <p>Impossible de contacter le serveur des news.</br>Merci de vérifier votre configuration.</p>
                        </div>
                    </div>`
            newsElement.appendChild(blockNews);
        }
    }

    socialLick() {
        let socials = document.querySelectorAll('.social-block')

        socials.forEach(social => {
            social.addEventListener('click', e => {
                shell.openExternal(e.target.dataset.url)
            })
        });
    }

    async instancesSelect() {
        let configClient = await this.db.readData('configClient')
        let auth = await this.db.readData('accounts', configClient.account_selected)
        let instancesList = await config.getInstanceList()
        let instanceSelect = instancesList.find(i => i.name == configClient?.instance_select) ? configClient?.instance_select : null

        let instanceBTN = document.querySelector('.play-instance')
        let instancePopup = document.querySelector('.instance-popup')
        let instancesListPopup = document.querySelector('.instances-List')
        let instanceCloseBTN = document.querySelector('.close-popup')

        if (instancesList.length === 0) {
            let popupError = new popup()
            popupError.openPopup({
                title: 'Erreur',
                content: 'Impossible de récupérer la liste des instances.<br>Vérifiez votre connexion internet ou réessayez plus tard.',
                color: 'red',
                options: [
                    { name: "Réessayer", func: () => { location.reload() } }
                ]
            })
            return;
        }

        if (!instanceSelect) {
            let newInstanceSelect = instancesList.find(i => i.whitelistActive == false)
            let configClient = await this.db.readData('configClient')
            configClient.instance_select = newInstanceSelect.name
            instanceSelect = newInstanceSelect.name
            await this.db.updateData('configClient', configClient)
        }

        for (let instance of instancesList) {
            if (instance.whitelistActive) {
                let whitelist = instance.whitelist.find(whitelist => whitelist == auth?.name)
                if (whitelist !== auth?.name) {
                    if (instance.name == instanceSelect) {
                        let newInstanceSelect = instancesList.find(i => i.whitelistActive == false)
                        let configClient = await this.db.readData('configClient')
                        configClient.instance_select = newInstanceSelect.name
                        instanceSelect = newInstanceSelect.name
                        setStatus(newInstanceSelect.status)
                        await this.db.updateData('configClient', configClient)
                    }
                }
            } else console.log(`Initializing instance ${instance.name}...`)
            if (instance.name == instanceSelect) setStatus(instance.status)
        }

        instancePopup.addEventListener('click', async e => {
            let configClient = await this.db.readData('configClient')

            if (e.target.classList.contains('instance-elements')) {
                let newInstanceSelect = e.target.id
                let activeInstanceSelect = document.querySelector('.active-instance')

                if (activeInstanceSelect) activeInstanceSelect.classList.toggle('active-instance');
                e.target.classList.add('active-instance');

                configClient.instance_select = newInstanceSelect
                await this.db.updateData('configClient', configClient)
                instanceSelect = instancesList.filter(i => i.name == newInstanceSelect)
                instancePopup.style.display = 'none'
                let instance = await config.getInstanceList()
                let options = instance.find(i => i.name == configClient.instance_select)
                await setStatus(options.status)
            }
        })

        instanceBTN.addEventListener('click', async e => {
            let configClient = await this.db.readData('configClient')
            let instanceSelect = configClient.instance_select
            let auth = await this.db.readData('accounts', configClient.account_selected)

            if (e.target.classList.contains('instance-select')) {
                instancesListPopup.innerHTML = ''
                for (let instance of instancesList) {
                    if (instance.whitelistActive) {
                        instance.whitelist.map(whitelist => {
                            if (whitelist == auth?.name) {
                                if (instance.name == instanceSelect) {
                                    instancesListPopup.innerHTML += `<div id="${instance.name}" class="instance-elements active-instance">${instance.name}</div>`
                                } else {
                                    instancesListPopup.innerHTML += `<div id="${instance.name}" class="instance-elements">${instance.name}</div>`
                                }
                            }
                        })
                    } else {
                        if (instance.name == instanceSelect) {
                            instancesListPopup.innerHTML += `<div id="${instance.name}" class="instance-elements active-instance">${instance.name}</div>`
                        } else {
                            instancesListPopup.innerHTML += `<div id="${instance.name}" class="instance-elements">${instance.name}</div>`
                        }
                    }
                }

                instancePopup.style.display = 'flex'
            }

            if (!e.target.classList.contains('instance-select')) this.startGame()
        })

        instanceCloseBTN.addEventListener('click', () => instancePopup.style.display = 'none')
    }

    async startGame() {
        try {
            let launch = new Launch()
            let configClient = await this.db.readData('configClient')
            let instance = await config.getInstanceList()
            let authenticator = await this.db.readData('accounts', configClient.account_selected)
            let options = instance.find(i => i.name == configClient.instance_select)

            if (!options) {
                let popupError = new popup();
                popupError.openPopup({
                    title: 'Erreur',
                    content: 'Impossible de récupérer les informations du serveur.<br>Vérifiez votre connexion internet.',
                    color: 'red',
                    options: [{ name: 'Réessayer', func: () => { location.reload() } }]
                });
                return;
            }

            let playInstanceBTN = document.querySelector('.play-instance')
            let infoStartingBOX = document.querySelector('.info-starting-game')
            let infoStarting = document.querySelector(".info-starting-game-text")
            let progressBar = document.querySelector('.progress-bar')

            let rootPath = `${await appdata()}/${process.platform == 'darwin' ? this.config.dataDirectory : `.${this.config.dataDirectory}`}`;

            // Gère si Java chemin valide ou laisse le module s'en occuper
            let validJavaPath = configClient.java_config?.java_path || null;

            let opt = {
                url: options.url,
                authenticator: authenticator,
                timeout: 30000,
                path: rootPath,
                instance: options.name,
                version: options.loader.minecraft_version,
                detached: configClient.launcher_config.closeLauncher == "close-all" ? false : true,
                downloadFileMultiple: configClient.launcher_config.download_multi,
                intelEnabledMac: configClient.launcher_config.intelEnabledMac,

                loader: {
                    type: options.loader.loader_type,
                    build: options.loader.loader_version,
                    enable: options.loader.loader_type == 'none' ? false : true
                },

                verify: options.verify ?? this.config.verify ?? false,
                ignored: [...(options.ignored || this.config.ignored || [])].filter(file => {
                    let filePath = path.join(rootPath, 'instances', options.name, file);
                    return fs.existsSync(filePath);
                }),

                java: {
                    path: validJavaPath,
                },

                // LES OPTIMISATIONS JAVA D'ARCADIA
                JVM_ARGS: [
                    "-XX:+ParallelRefProcEnabled",
                    "-XX:MaxGCPauseMillis=200",
                    "-XX:+UnlockExperimentalVMOptions",
                    "-XX:+DisableExplicitGC",
                    "-XX:+AlwaysPreTouch",
                    "-XX:G1NewSizePercent=30",
                    "-XX:G1MaxNewSizePercent=40",
                    "-XX:G1HeapRegionSize=8M",
                    "-XX:G1ReservePercent=20",
                    "-XX:G1HeapWastePercent=5",
                    "-XX:G1MixedGCCountTarget=4",
                    "-XX:InitiatingHeapOccupancyPercent=15",
                    "-XX:G1MixedGCLiveThresholdPercent=90",
                    "-XX:G1RSetUpdatingPauseTimePercent=5",
                    "-XX:SurvivorRatio=32",
                    "-XX:+PerfDisableSharedMem",
                    "-XX:MaxTenuringThreshold=1",
                    "-Dusing.aikars.flags=https://mcflags.emc.gs",
                    "-Daikars.new.flags=true",
                    "-Dmodernfix.allowSparkProfiling=true",
                    ...(options.jvm_args || [])
                ],
                GAME_ARGS: options.game_args ? options.game_args : [],

                screen: {
                    width: configClient.game_config.screen_size.width,
                    height: configClient.game_config.screen_size.height
                },

                memory: {
                    min: `${configClient.java_config.java_memory.min * 1024}M`,
                    max: `${configClient.java_config.java_memory.max * 1024}M`
                }
            }

            let launchWatchdog = setTimeout(() => {
                console.error('[Watchdog] Lancement du jeu trop long, annulation forcée.');
                // Tuer le processus de launch s'il est encore en cours
                try { if (launch.proc) launch.proc.kill(); } catch (_) { }
                let popupError = new popup();
                popupError.openPopup({
                    title: 'Délai dépassé',
                    content: 'Le lancement a pris trop longtemps et a été annulé.<br>Vérifiez votre connexion ou essayez de réparer le jeu (bouton 🔧).',
                    color: 'red',
                    options: [{ name: 'OK', func: () => { } }]
                });
                document.querySelector('.play-instance').style.display = "flex";
                document.querySelector('.info-starting-game').style.display = "none";
            }, 45 * 60 * 1000); // 45 minutes

            launch.Launch(opt);

            playInstanceBTN.style.display = "none"
            infoStartingBOX.style.display = "block"
            progressBar.style.display = "";
            ipcRenderer.send('main-window-progress-load')

            launch.on('extract', extract => {
                ipcRenderer.send('main-window-progress-load')
                console.log(extract);
            });

            launch.on('progress', (progress, size) => {
                infoStarting.innerHTML = `Téléchargement ${((progress / size) * 100).toFixed(0)}%`
                ipcRenderer.send('main-window-progress', { progress, size })
                progressBar.value = progress;
                progressBar.max = size;
            });

            launch.on('check', (progress, size) => {
                infoStarting.innerHTML = `Vérification ${((progress / size) * 100).toFixed(0)}%`
                ipcRenderer.send('main-window-progress', { progress, size })
                progressBar.value = progress;
                progressBar.max = size;
            });

            launch.on('estimated', (time) => {
                let hours = Math.floor(time / 3600);
                let minutes = Math.floor((time - hours * 3600) / 60);
                let seconds = Math.floor(time - hours * 3600 - minutes * 60);
                console.log(`${hours}h ${minutes}m ${seconds}s`);
            })

            launch.on('speed', (speed) => {
                console.log(`${(speed / 1067008).toFixed(2)} Mb/s`)
            })

            launch.on('patch', patch => {
                console.log(patch);
                ipcRenderer.send('main-window-progress-load')
                infoStarting.innerHTML = `Patch en cours...`
            });

            launch.on('data', (e) => {
                clearTimeout(launchWatchdog);
                progressBar.style.display = "none"
                if (configClient.launcher_config.closeLauncher == 'close-launcher') {
                    ipcRenderer.send("main-window-hide")
                };
                new logger('Minecraft', '#36b030');
                ipcRenderer.send('main-window-progress-load')
                infoStarting.innerHTML = `Demarrage en cours...`
                console.log(e);
            })

            launch.on('close', code => {
                clearTimeout(launchWatchdog);
                if (configClient.launcher_config.closeLauncher == 'close-launcher') {
                    ipcRenderer.send("main-window-show")
                };
                ipcRenderer.send('main-window-progress-reset')
                infoStartingBOX.style.display = "none"
                playInstanceBTN.style.display = "flex"
                infoStarting.innerHTML = `Vérification`
                new logger(pkg.name, '#7289da');
                console.log('Close : ' + code);
            });

            launch.on('error', err => {
                clearTimeout(launchWatchdog);
                let popupError = new popup()
                popupError.openPopup({
                    title: 'Erreur',
                    content: err.message || err.error || String(err),
                    color: 'red',
                    options: true
                })

                if (configClient.launcher_config.closeLauncher == 'close-launcher') {
                    ipcRenderer.send("main-window-show")
                };
                ipcRenderer.send('main-window-progress-reset')
                infoStartingBOX.style.display = "none"
                playInstanceBTN.style.display = "flex"
                infoStarting.innerHTML = `Vérification`
                new logger(pkg.name, '#7289da');
                console.error(err);
            });

            // LE CATCH PROTECTEUR
        } catch (error) {
            console.error(error);
            let popupError = new popup();
            popupError.openPopup({
                title: 'Erreur au Lancement',
                content: `Détails : ${error.message}`,
                color: 'red',
                options: true
            });
            document.querySelector('.play-instance').style.display = "flex";
            document.querySelector('.info-starting-game').style.display = "none";
        }
    }


    getdate(e) {
        let date = new Date(e)
        let year = date.getFullYear()
        let month = date.getMonth() + 1
        let day = date.getDate()
        let allMonth = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']
        return { year: year, month: allMonth[month - 1], day: day }
    }

    async deleteModpack() {
        let appDataDir = await appdata();
        let baseDir = path.join(appDataDir, process.platform == 'darwin' ? this.config.dataDirectory : `.${this.config.dataDirectory}`);
        let instancesDir = path.join(baseDir, 'instances');
        if (fs.existsSync(instancesDir)) {
            try {
                fs.rmSync(instancesDir, { recursive: true, force: true });
                fs.mkdirSync(instancesDir);
                let popupSuccess = new popup();
                popupSuccess.openPopup({
                    title: 'Succès',
                    content: 'Le jeu a été réinitialisé avec succès.',
                    color: 'green',
                    options: [
                        { name: 'OK', func: () => { location.reload(); } }
                    ]
                });
            } catch (e) {
                console.error('Failed to delete instances:', e);
                let popupError = new popup();
                popupError.openPopup({
                    title: 'Erreur',
                    content: 'Une erreur est survenue lors de suppression.',
                    color: 'red'
                });
            }
        } else {
            let popupInfo = new popup();
            popupInfo.openPopup({
                title: 'Info',
                content: 'Aucun dossier de jeu à réinitialiser.',
                color: 'var(--element-color)',
                options: true
            });
        }
    }

}
export default Home;