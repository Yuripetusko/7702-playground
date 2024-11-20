import hre from 'hardhat';

export const sleep = (ms: number): Promise<void> => {
  return new Promise((resolve) => {
    setTimeout(() => resolve(), ms);
  });
};

export function isHardhatNetwork(): boolean {
  const network = hre.network.name;
  return ['hardhat', 'localhost'].includes(network);
}

export async function verifyIfNotHardhat(
  contractAddress: string,
  args: any[] = [],
) {
  if (isHardhatNetwork()) {
    // Hardhat
    return;
  }

  // sleep 10s
  await sleep(20000);

  console.log('Contract verification starting now.');
  try {
    await hre.run('verify:verify', {
      address: contractAddress,
      constructorArguments: args,
    });
  } catch (error) {
    // probably already verified
  }
}
