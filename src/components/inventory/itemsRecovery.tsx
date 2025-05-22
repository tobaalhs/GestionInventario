import { collection, getDocs } from "firebase/firestore";
import { db } from "../../firebase/config";

type Item = {
    id: string;
    stock: number;
    name: string;
    category?: string;
    // otras propiedades...
};

// Ahora solo trae todos los items, sin filtrar ni ordenar
async function getAllItems(): Promise<Item[]> {
    const q = collection(db, "items");
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
    })) as Item[];
}

// Ordenar por stock descendente
export function sortByStock(items: Item[]): Item[] {
    return [...items].sort((a, b) => b.stock - a.stock);
}

// Ordenar por categoría alfabética
export function sortByCategory(items: Item[]): Item[] {
    return [...items].sort((a, b) => (a.category || '').localeCompare(b.category || ''));
}

// Ordenar por id alfabético
export function sortById(items: Item[]): Item[] {
    return [...items].sort((a, b) => a.id.localeCompare(b.id));
}

// Ordenar por nombre alfabético
export function sortByName(items: Item[]): Item[] {
    return [...items].sort((a, b) => a.name.localeCompare(b.name));
}

export default getAllItems;