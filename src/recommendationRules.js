export function applyRecommendationRules(products) {

    let firstProductCloseness = parseFloat(products[0].rank);

    for(let i = 0; i<products.length;i++){


        if(i === 0 && (products[0].metadata.hasPromotion || products[0].metadata.isNew) ){
            continue;
        }

        if (products[i].metadata.hasPromotion && Math.abs(firstProductCloseness - parseFloat(products[i].rank)) < 0.2 ){
            products[i].rank = parseFloat(products[i].rank) - 0.2;
        }

        if (products[i].metadata.isNew && Math.abs(firstProductCloseness - parseFloat(products[i].rank)) < 0.15 ){
            products[i].rank = parseFloat(products[i].rank) - 0.15;
        }

    }

    return products.sort((a, b) => a.rank - b.rank);

}