const SortedPositions = artifacts.require("./SortedPositions.sol")
const PositionManager = artifacts.require("./PositionManager.sol")
const PriceFeedTestnet = artifacts.require("./PriceFeedTestnet.sol")
const RToken = artifacts.require("./RToken.sol")

const LiquityMathTester = artifacts.require("./LiquityMathTester.sol")
const PositionManagerTester = artifacts.require("./PositionManagerTester.sol")
const RTokenTester = artifacts.require("./RTokenTester.sol")
const WstETHTokenMock = artifacts.require("./WstETHTokenMock.sol")

/* "Liquity core" consists of all contracts in the core Liquity system.

*/
const maxBytes32 = '0x' + 'f'.repeat(64)

class DeploymentHelper {

  static async deployLiquityCore(feeRecipient) {
    const cmdLineArgs = process.argv
    const frameworkPath = cmdLineArgs[1]
    // console.log(`Framework used:  ${frameworkPath}`)

    if (frameworkPath.includes("hardhat")) {
      return this.deployLiquityCoreHardhat(feeRecipient)
    } else if (frameworkPath.includes("truffle")) {
      return this.deployLiquityCoreTruffle()
    }
  }

  static async deployLiquityCoreHardhat(feeRecipient) {
    const priceFeedTestnet = await PriceFeedTestnet.new({ from: feeRecipient })
    const wstETHTokenMock = await WstETHTokenMock.new({ from: feeRecipient })
    const positionManager = await PositionManagerTester.new(priceFeedTestnet.address, wstETHTokenMock.address, maxBytes32, { from: feeRecipient })
    const sortedPositions = await SortedPositions.at(await positionManager.sortedPositions())
    const rToken = await RTokenTester.at(await positionManager.rToken(), feeRecipient)
    RTokenTester.setAsDeployed(rToken)
    PriceFeedTestnet.setAsDeployed(priceFeedTestnet)
    SortedPositions.setAsDeployed(sortedPositions)
    PositionManagerTester.setAsDeployed(positionManager)

    const coreContracts = {
      priceFeedTestnet,
      rToken,
      sortedPositions,
      positionManager,
      wstETHTokenMock
    }
    return coreContracts
  }

  static async mintR(rToken, to = null, amount = null) {
    to = to || (await ethers.getSigners())[0].address;
    amount = amount ? ethers.BigNumber.from(amount) : ethers.BigNumber.from("1000000000000000000000000")

    const positionManagerAddress = await rToken.positionManager();
    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [positionManagerAddress]
    })
    await rToken.mint(to, amount, { from: positionManagerAddress, gasPrice: 0 })

    await hre.network.provider.request({
      method: "hardhat_stopImpersonatingAccount",
      params: [positionManagerAddress]
    })
  }

  static async deployTesterContractsHardhat() {
    const testerContracts = {}

    // Contract without testers (yet)
    testerContracts.priceFeedTestnet = await PriceFeedTestnet.new()
    testerContracts.sortedPositions = await SortedPositions.new()
    testerContracts.wstETHTokenMock = await WstETHTokenMock.new();
    // Actual tester contracts
    testerContracts.math = await LiquityMathTester.new()
    testerContracts.positionManager = await PositionManagerTester.new()
    testerContracts.rToken =  await RTokenTester.new(
      testerContracts.positionManager.address
    )
    return testerContracts
  }

  static async deployLiquityCoreTruffle() {
    const priceFeedTestnet = await PriceFeedTestnet.new()
    const sortedPositions = await SortedPositions.new()
    const positionManager = await PositionManager.new()
    const rToken = await RToken.new(
      positionManager.address
    )
    const coreContracts = {
      priceFeedTestnet,
      rToken,
      sortedPositions,
      positionManager
    }
    return coreContracts
  }
}
module.exports = DeploymentHelper
