import fs from "fs/promises";
import path from "path";

// Contador global de referencia (persiste entre llamadas)
let contadorReferencia = 0;

function getRandomProduct(category) {

    const categoryType = {
        beers: "Cerveza",
        drinks: "Bebidas",
        feeding: "Alimentación",
        frozen: "Frío y Congelado",
        coffee: "Café",
        wines: "Vinos y Cavas",
        liquors: "Licores",
        cleaning: "Limpieza"
    };

    const nameType = {
        beers: ["Rubia", "Tostada", "Sin Alcohol", "Radler Limón", "Especial", "Negra", "Trigo", "Lager"],
        drinks: ["Agua Mineral", "Refresco Cola", "Té Frío", "Naranja", "Limón", "Tónica", "Gaseosa", "Isotónica"],
        feeding: ["Harina", "Arroz", "Pasta", "Legumbres", "Conserva", "Salsa", "Cereales", "Galletas"],
        frozen: ["Pizza", "Croquetas", "Verdura Congelada", "Helado", "Pescado Rebozado", "Empanadillas", "Pollo", "Patatas Fritas"],
        coffee: ["Molido", "Grano", "Cápsulas", "Soluble", "Descafeinado", "Mezcla", "Natural", "Torrefacto"],
        wines: ["Tinto Crianza", "Blanco Joven", "Rosado", "Cava Brut", "Reserva", "Gran Reserva", "Espumoso", "Tinto Roble"],
        liquors: ["Ginebra", "Ron", "Whisky", "Vodka", "Anís", "Licor de Crema", "Brandy", "Pacharán"],
        cleaning: ["Detergente Líquido", "Suavizante", "Lejía", "Limpiacristales", "Friegasuelos", "Desinfectante", "Quitagrasas", "Lavavajillas"]
    };

    const brandType = {
        beers: ["San Miguel", "Mahou", "Radler", "Reserva 1925", "R. Roja", "Alhambra", "Nord Pirineus", "Brutus", "Franziskaner"],
        drinks: ["Font Vella", "Lanjaron", "Asturiana", "La Casera", "Schweppes", "Pepsi", "Nestea", "Lipton", "Fanta", "Kas"],
        feeding: ["Maizena", "Vencerol", "Marimba", "Campos", "Excelencia", "Tafaner", "Urzante", "Gerio"],
        frozen: ["Campofrio", "La Cocinera", "Findus", "Frudesa", "Pescanova", "Ardo", "Maheso", "Miko", "Oscar Mayer"],
        coffee: ["Marcilla", "Saimaza", "Nescafé", "Bonka", "L'Or", "Illy", "Dolce Gusto", "Cafento", "El Corte Inglés"],
        wines: ["Marqués de Cáceres", "Torres", "Protos", "Campo Viejo", "Marqués de Riscal", "Faustino", "Ramón Bilbao", "CVNE", "Viña Sol"],
        liquors: ["Larios", "Beefeater", "Absolut", "Ballantine's", "J&B", "Bacardí", "Brugal", "Licor 43", "Baileys", "Ricard"],
        cleaning: ["Fairy", "Ariel", "Skip", "Mistol", "Don Limpio", "Cif", "Sanytol", "Norit", "Ajax", "Ballerina"]
    };

    const formatType = {
        beers: ["Botella 33cl", "Lata 33cl", "Pack 6 uds", "Pack 12 uds", "Botella 1L", "Barril 5L"],
        drinks: ["Botella 33cl", "Botella 1.5L", "Botella 2L", "Pack 6 uds", "Lata 33cl"],
        feeding: ["Paquete 500g", "Paquete 1kg", "Bote 400g", "Bolsa 250g", "Pack 3 uds"],
        frozen: ["Bolsa 1kg", "Caja 400g", "Tarrina 500g", "Bolsa 750g", "Caja 6 uds"],
        coffee: ["Paquete 250g", "Paquete 500g", "Caja 10 cápsulas", "Caja 16 cápsulas", "Bote 200g"],
        wines: ["Botella 75cl", "Botella 1.5L", "Pack 3 botellas", "Estuche Regalo", "Botella 37.5cl"],
        liquors: ["Botella 70cl", "Botella 1L", "Botella 1.5L", "Petaca 20cl"],
        cleaning: ["Botella 750ml", "Botella 1.5L", "Garrafa 3L", "Pack 2 uds", "Botella 500ml"]
    };

    const nombreProducto = nameType[category][Math.floor(Math.random() * nameType[category].length)];
    const marca = brandType[category][Math.floor(Math.random() * brandType[category].length)];
    const formato = formatType[category][Math.floor(Math.random() * formatType[category].length)];

    contadorReferencia++;
    const referencia = String(contadorReferencia).padStart(6, "0"); // "000001", "000002"...
    const precio = parseFloat((Math.random() * (50 - 1) + 1).toFixed(2));

    return {
        referencia,
        nombre: `${marca} ${nombreProducto}`,
        marca,
        categoria: categoryType[category],
        formato,
        precio,
        descripcion: null
    };
}

// Generar ~50 productos por categoría
function generarCatalogo(productosPorCategoria = 50) {
    const categorias = ["beers", "drinks", "feeding", "frozen", "coffee", "wines", "liquors", "cleaning"];
    const catalogo = [];

    categorias.forEach(categoria => {
        for (let i = 0; i < productosPorCategoria; i++) {
            catalogo.push(getRandomProduct(categoria));
        }
    });

    return catalogo;
}

// Guardar en products.json en la raíz del proyecto
export function initGetProducts() {
    const catalogo = generarCatalogo(100);
    const rutaSalida = path.join(process.cwd(), "data", "products.json");

    fs.writeFileSync(rutaSalida, JSON.stringify(catalogo, null, 2), "utf-8");
    console.log(`✅ Generados ${catalogo.length} productos en ${rutaSalida}`);
}