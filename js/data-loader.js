class DataLoader {
    constructor() {
        this.dangerousGoods = [];
        this.specialProvisions = [];
        this.eqCategories = [];
        this.packingInstructions = [];
    }

    async loadAllData() {
        try {
            console.log("Starte Daten-Ladevorgang...");
            const [dgRes, spRes, eqRes, piRes] = await Promise.all([
                fetch('data/dangerous_goods.json'),
                fetch('data/special_provisions.json'),
                fetch('data/eq_categories.json'),
                fetch('data/packing_instructions.json')
            ]);
            this.dangerousGoods = await dgRes.json();
            this.specialProvisions = await spRes.json();
            this.eqCategories = await eqRes.json();
            this.packingInstructions = await piRes.json();
            console.log("✅ Alle Daten erfolgreich geladen!");
            return true;
        } catch (error) {
            console.error("❌ Kritischer Fehler:", error);
            alert("Fehler beim Laden der Daten.");
            return false;
        }
    }

    getDGEntry(unNumber, packingGroup) {
        return this.dangerousGoods.find(item => item.un_number === unNumber && item.packing_group === packingGroup);
    }
    getSpecialProvision(code) { return this.specialProvisions.find(sp => sp.code === code); }
    getEQCategory(code) { return this.eqCategories.find(eq => eq.eq_code === code); }
    getPackingInstruction(id) { return this.packingInstructions.find(pi => pi.id === id); }
    getAllUNNumbers() {
        const allUn = this.dangerousGoods.map(item => item.un_number);
        return [...new Set(allUn)].sort(); 
    }
}