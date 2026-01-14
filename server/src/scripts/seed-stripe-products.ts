import 'dotenv/config';
import { getUncachableStripeClient } from '../services/stripeClient';

async function seedProducts() {
  console.log('Starting Stripe product seeding...');
  
  const stripe = await getUncachableStripeClient();
  
  const plans = [
    {
      id: 'PLAN_1',
      name: 'Plan Básico',
      description: '25 informes incluidos (50 en promoción por 3 meses)',
      priceMxn: 499,
      reportsIncluded: 25,
      reportsPromotion: 50,
      extraPrice: 30,
      extraPricePromotion: 20,
    },
    {
      id: 'PLAN_2',
      name: 'Plan Profesional',
      description: '55 informes incluidos (110 en promoción por 3 meses)',
      priceMxn: 999,
      reportsIncluded: 55,
      reportsPromotion: 110,
      extraPrice: 25,
      extraPricePromotion: 20,
    },
    {
      id: 'PLAN_3',
      name: 'Plan Empresarial',
      description: '170 informes incluidos (340 en promoción por 3 meses)',
      priceMxn: 2999,
      reportsIncluded: 170,
      reportsPromotion: 340,
      extraPrice: 20,
      extraPricePromotion: 19,
    },
  ];

  for (const plan of plans) {
    console.log(`\nChecking if ${plan.name} exists...`);
    
    const existingProducts = await stripe.products.search({
      query: `metadata['planType']:'${plan.id}'`,
    });

    if (existingProducts.data.length > 0) {
      console.log(`${plan.name} already exists (${existingProducts.data[0].id}), skipping...`);
      continue;
    }

    console.log(`Creating ${plan.name}...`);
    
    const product = await stripe.products.create({
      name: plan.name,
      description: plan.description,
      metadata: {
        planType: plan.id,
        reportsIncluded: plan.reportsIncluded.toString(),
        reportsPromotion: plan.reportsPromotion.toString(),
        extraPrice: plan.extraPrice.toString(),
        extraPricePromotion: plan.extraPricePromotion.toString(),
      },
    });

    console.log(`Created product: ${product.id}`);

    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: plan.priceMxn * 100,
      currency: 'mxn',
      recurring: {
        interval: 'month',
      },
      metadata: {
        planType: plan.id,
      },
    });

    console.log(`Created price: ${price.id} - $${plan.priceMxn} MXN/mes`);
  }

  console.log('\n✅ Product seeding completed!');
}

seedProducts()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error seeding products:', error);
    process.exit(1);
  });
