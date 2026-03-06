const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { createObjectCsvWriter } = require('csv-writer');
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');

const csv_file = path.join(__dirname, '../data/campaigns_data_2026.csv');
const creativesCsv = path.join(__dirname, '../data/creatives.csv');



exports.getCampaigns = (req, res) => {

    const campaigns = [];
    const { id, name, status, q, page = 1, limit } = req.query;
    
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    if (!fs.existsSync(csv_file)) {
        return res.status(404).json({ error: "File CSV non trovato" });
    }

    fs.createReadStream(csv_file)
        .pipe(csv())
        .on('data', (data) => campaigns.push(data))
        .on('end', () => {
            let filteredResults = campaigns;

            if (status !== undefined && status !== '') {
                filteredResults = filteredResults.filter(c => c.status === status);
            }

            if (id) {
                filteredResults = filteredResults.filter(c => c.id === id);
            }

            if (name) {
                const nm = name.toLowerCase();
                filteredResults = filteredResults.filter(c => c.name?.toLowerCase().includes(nm));
            }

            if (q) {
                const searchTerm = q.toLowerCase();
                filteredResults = filteredResults.filter(c => 
                    c.name?.toLowerCase().includes(searchTerm) || 
                    c.id?.toLowerCase().includes(searchTerm)
                );
            }

            const totalItems = filteredResults.length;
            const startIndex = (pageNum - 1) * limitNum;
            const endIndex = pageNum * limitNum;
            
            const paginatedResults = filteredResults.slice(startIndex, endIndex);

            res.status(200).json({
                success: true,
                meta: {
                    total: totalItems,
                    page: pageNum,
                    limit: limitNum,
                    totalPages: Math.ceil(totalItems / limitNum)
                },
                data: paginatedResults
            });
        })
        .on('error', () => {
            res.status(500).json({ error: "Errore durante il processing del CSV" });
        });
};

exports.getCampaignById = (req, res) => {
    const { id } = req.params;
    let foundCampaign = null;

    if (!fs.existsSync(csv_file)) {
        return res.status(404).json({ error: "File CSV non trovato" });
    }

    fs.createReadStream(csv_file)
        .pipe(csv())
        .on('data', (row) => {
            if (row.id === id) {
                foundCampaign = row;
            }
        })
        .on('end', () => {
            if (foundCampaign) {
                res.status(200).json({
                    success: true,
                    data: foundCampaign
                });
            } else {
                res.status(404).json({ 
                    success: false, 
                    message: `Campagna con ID ${id} non trovata` 
                });
            }
        });
};

exports.updateCampaign = (req, res) => {
    const { id, status, landingUrl, name, imageUrl } = req.body;
    let allCampaigns = [];
    let found = false;

    if (!id) {
        return res.status(400).json({ error: "L'ID della campagna è obbligatorio, per favore, fornisci un ID valido." });
    }

    if (status !== undefined && ![0, 1, "0", "1"].includes(status)) {
        return res.status(400).json({ error: "Lo status deve essere 0 (inattivo) o 1 (attivo). Status fornito non valido." });
    }

    if (landingUrl) {
        try {
            new URL(landingUrl);
        } catch (e) {
            return res.status(400).json({ error: "landingUrl non è un URL valido" });
        }
    }

    if (imageUrl) {
        try {
            new URL(imageUrl);
        } catch (e) {
            return res.status(400).json({ error: "imageUrl non è un URL valido" });
        }
    }

    if (name !== undefined && typeof name !== 'string') {
        return res.status(400).json({ error: "Il nome deve essere una stringa" });
    }

    fs.createReadStream(csv_file)
        .pipe(csv())
        .on('data', (row) => {
            if (row.id === id) {
                if (status !== undefined) row.status = status.toString();
                if (landingUrl) row.landingUrl = landingUrl;
                if (name !== undefined) row.name = name;
                if (imageUrl) row.imageUrl = imageUrl;
                found = true;
            }
            allCampaigns.push(row);
        })
        .on('end', () => {
            if (!found) {
                return res.status(404).json({ error: "Campagna non trovata" });
            }

            const csvWriter = createObjectCsvWriter({
                path: csv_file,
                header: Object.keys(allCampaigns[0]).map(key => ({ id: key, title: key }))
            });

            csvWriter.writeRecords(allCampaigns)
                .then(() => {
                    res.json({ success: true, message: "Campagna aggiornata", data: allCampaigns.find(c => c.id === id) });
                })
                .catch(err => res.status(500).json({ error: "Errore durante la scrittura del file" }));
        });
};

exports.getCampaignCreatives = (req, res) => {
        const campaignId = req.params.id;
    const creativesPath = path.join(__dirname, '../data/creatives.csv');
    const creatives = [];

    if (!fs.existsSync(creativesPath)) {
        return res.json({ campaignId, creatives: [] });
    }

    fs.createReadStream(creativesPath)
        .pipe(csv())
        .on('data', (row) => {
            if (row.campaignId === campaignId) {
                creatives.push({
                    id: row.id,
                    filename: row.id + path.extname(row.image),
                    url: `/uploads/${row.id}${path.extname(row.image)}`,
                    originalName: row.image,
                    createdAt: row.createdAt
                });
            }
        })
        .on('end', () => {
            res.json({
                campaignId,
                creatives
            });
        });
};

exports.uploadCreative = async (req, res) => {
    const { id: campaignId } = req.params;
    const file = req.file;

    if (!file) {
        return res.status(400).json({ error: "Nessun file immagine fornito" });
    }

    let campaignStatus = null;

    if (!fs.existsSync(csv_file)) {
        fs.unlinkSync(file.path);
        return res.status(500).json({ error: "File delle campagne non trovato" });
    }

    try {
        await new Promise((resolve, reject) => {
            fs.createReadStream(csv_file)
                .pipe(csv())
                .on('data', row => {
                    if (row.id === campaignId) {
                        campaignStatus = row.status;
                    }
                })
                .on('end', resolve)
                .on('error', reject);
        });
    } catch (err) {
        fs.unlinkSync(file.path);
        return res.status(500).json({ error: "Errore durante la lettura delle campagne" });
    }

    if (campaignStatus === null) {
        fs.unlinkSync(file.path);
        return res.status(404).json({ error: `Campagna con ID ${campaignId} non trovata` });
    }

    if (String(campaignStatus) === '0') {
        fs.unlinkSync(file.path);
        return res.status(400).json({ error: "Impossibile aggiungere creative a una campagna in pausa (status 0)" });
    }

    let count = 0;
    if (fs.existsSync(creativesCsv)) {
        try {
            await new Promise((resolve, reject) => {
                fs.createReadStream(creativesCsv)
                    .pipe(csv())
                    .on('data', row => {
                        if (row.campaignId === campaignId) {
                            count++;
                        }
                    })
                    .on('end', resolve)
                    .on('error', reject);
            });
        } catch (err) {
            fs.unlinkSync(file.path);
            return res.status(500).json({ error: "Errore durante il conteggio delle creative" });
        }
    }

    if (count >= 3) {
        fs.unlinkSync(file.path);
        return res.status(400).json({ error: "Limite massimo di 3 creative per campagna raggiunto" });
    }

    try {
        const metadata = await sharp(file.path).metadata();
        
        if (metadata.width !== 320 || metadata.height !== 480) {
            fs.unlinkSync(file.path); 
            return res.status(400).json({ 
                error: `Dimensioni errate: ${metadata.width}x${metadata.height}. Richiesto il formato 320x480.` 
            });
        }


        const creativeId = uuidv4();
        const originalName = file.originalname;
        const ext = path.extname(originalName) || '';
        const newFileName = creativeId + ext;
        const uploadsDir = path.join(__dirname, '../uploads');
        const newFilePath = path.join(uploadsDir, newFileName);

        fs.renameSync(file.path, newFilePath);

        const newCreative = {
            id: creativeId,
            campaignId: campaignId,
            image: originalName,
            createdAt: new Date().toISOString()
        };

        const creativesPath = path.join(__dirname, '../data/creatives.csv');
        const fileExists = fs.existsSync(creativesPath);
        const isEmpty = !fileExists || fs.statSync(creativesPath).size === 0;
        const csvWriter = createObjectCsvWriter({
            path: creativesPath,
            header: [
                { id: 'id', title: 'id' },
                { id: 'campaignId', title: 'campaignId' },
                { id: 'image', title: 'image' },
                { id: 'createdAt', title: 'createdAt' }
            ],
            append: fileExists && !isEmpty
        });

        await csvWriter.writeRecords([newCreative]);

        res.status(201).json({
            success: true,
            message: "Nuova creazione aggiunta con successo",
            data: newCreative
        });

    } catch (err) {
        res.status(500).json({ error: "Errore durante la creazione: " + err.message });
    }
};
