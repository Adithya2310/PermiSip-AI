import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { Contract } from "ethers";

/**
 * Deploys PermiSIPAI contract with mock protocols
 *
 * @param hre HardhatRuntimeEnvironment object.
 */
const deployPermiSIPAI: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  // Expert Agent Address for AI payments
  const EXPERT_AGENT_ADDRESS = "0x15ac9ed46c545D594B57aFe20F0f268F182A481f";

  console.log("\n📦 Deploying PermiSIPAI contracts...\n");

  // Deploy Mock Protocols
  console.log("🚀 Deploying MockAave...");
  const mockAave = await deploy("MockAave", {
    from: deployer,
    args: [],
    log: true,
    autoMine: true,
  });
  console.log(`✅ MockAave deployed to: ${mockAave.address}`);

  console.log("\n🚀 Deploying MockCompound...");
  const mockCompound = await deploy("MockCompound", {
    from: deployer,
    args: [],
    log: true,
    autoMine: true,
  });
  console.log(`✅ MockCompound deployed to: ${mockCompound.address}`);

  console.log("\n🚀 Deploying MockUniswap...");
  const mockUniswap = await deploy("MockUniswap", {
    from: deployer,
    args: [],
    log: true,
    autoMine: true,
  });
  console.log(`✅ MockUniswap deployed to: ${mockUniswap.address}`);

  // Deploy PermiSIPAI
  console.log("\n🚀 Deploying PermiSIPAI...");
  const permiSIPAI = await deploy("PermiSIPAI", {
    from: deployer,
    args: [mockAave.address, mockCompound.address, mockUniswap.address],
    log: true,
    autoMine: true,
  });
  console.log(`✅ PermiSIPAI deployed to: ${permiSIPAI.address}`);

  // Set Expert Agent Address
  console.log("\n⚙️ Setting Expert Agent Address...");
  const permiSIPAIContract = await hre.ethers.getContract<Contract>("PermiSIPAI", deployer);
  const tx = await permiSIPAIContract.setExpertAgentAddress(EXPERT_AGENT_ADDRESS);
  await tx.wait();
  console.log(`✅ Expert Agent Address set to: ${EXPERT_AGENT_ADDRESS}`);

  // Verify configuration
  const expertAgentAddress = await permiSIPAIContract.expertAgentAddress();
  const owner = await permiSIPAIContract.owner();

  console.log("\n📋 PermiSIPAI Configuration:");
  console.log(`   Owner: ${owner}`);
  console.log(`   Expert Agent: ${expertAgentAddress}`);
  console.log(`   Aave Protocol: ${mockAave.address}`);
  console.log(`   Compound Protocol: ${mockCompound.address}`);
  console.log(`   Uniswap Protocol: ${mockUniswap.address}`);
  console.log("\n✨ Deployment complete!\n");
};

export default deployPermiSIPAI;

// Tags are useful if you have multiple deploy files and only want to run one of them.
// e.g. yarn deploy --tags PermiSIPAI
deployPermiSIPAI.tags = ["PermiSIPAI", "MockProtocols"];
