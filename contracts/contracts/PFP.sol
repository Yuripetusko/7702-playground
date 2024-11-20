// SPDX-License-Identifier: Apache-2.0

pragma solidity ^0.8.23;

import {RMRKAbstractEquippable} from "@rmrk-team/evm-contracts/contracts/implementations/abstract/RMRKAbstractEquippable.sol";
import {RMRKImplementationBase} from "@rmrk-team/evm-contracts/contracts/implementations/utils/RMRKImplementationBase.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {Base64} from "@openzeppelin/contracts/utils/Base64.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";

    error ContractURIFrozen();

contract PFP is RMRKAbstractEquippable {
    using Strings for uint256;

    // Events

    /**
    * @notice From ERC4906 This event emits when the metadata of a token is changed.
     *  So that the third-party platforms such as NFT market could
     *  get notified when the metadata of a token is changed.
     */
    event MetadataUpdate(uint256 _tokenId);

    /**
     * @notice From ERC7572 (Draft) Emitted when the contract-level metadata is updated
     */
    event ContractURIUpdated();

    // Variables
    mapping(uint64 assetId => string imgUri) private _imgPerAsset;
    mapping(address => bool) private _autoAcceptCollection;
    bool private _autoAcceptAllCollections;
    uint256 private _contractURIFrozen; // Cheaper than a bool
    string private _baseAnimationURI;
    uint64 private _mainAssetId;
    mapping(uint256 tokenId => uint256 timestamp) private _lastEquipUpdate;

    // Constructor
    constructor(
        string memory name,
        string memory symbol,
        string memory collectionMetadata,
        uint256 maxSupply,
        address royaltyRecipient,
        uint16 royaltyPercentageBps
    )
    RMRKImplementationBase(
    name,
    symbol,
    collectionMetadata,
    maxSupply,
    royaltyRecipient,
    royaltyPercentageBps
    )
    {}

    // TOKEN URI

    function setImgUri(
        uint64 assetId,
        string memory imgUri
    ) external onlyOwnerOrContributor {
        _imgPerAsset[assetId] = imgUri;
    }

    function setBaseAnimationURI(
        string memory baseAnimationURI
    ) external onlyOwnerOrContributor {
        _baseAnimationURI = baseAnimationURI;
    }

    function setMainAssetId(
        uint64 mainAssetId
    ) external onlyOwnerOrContributor {
        _mainAssetId = mainAssetId;
    }

    function tokenURI(uint256 tokenId) external view returns (string memory) {
        _requireMinted(tokenId);
        string memory tokenID = tokenId.toString();
        uint64 mainAssetId = getActiveAssets(tokenId)[0];
        string memory imgURI = _imgPerAsset[mainAssetId];
        string memory json = string(
            abi.encodePacked(
                '{\n\t"name": "Odyssey PFP #',
                tokenID,
                '",\n\t"description": "Your Odyssey PFP, ready to be equipped with different NFTs to create your unique digital identity.',
                '",\n\t"external_url": "https://ithaca.xyz/',
                '",\n\t"image": "',
                imgURI,
                '",\n\t"mediaUri": "',
                imgURI,
                '",\n\t"animation_url": "',
                _baseAnimationURI,
                tokenID,
                '"\n}'
            )
        ); // format the json

        return
            string(
            abi.encodePacked(
                "data:application/json;base64,",
                Base64.encode(bytes(json))
            )
        ); // return the full concatenated string
    }

    // MINTING

    function mintWithAsset(
        address to,
        uint256 amount,
        uint64 assetId
    ) public virtual {
        (uint256 nextToken, uint256 totalSupplyOffset) = _prepareMint(amount);

        for (uint256 i = nextToken; i < totalSupplyOffset;) {
            _safeMint(to, i, "");
            _addAssetToToken(i, assetId, 0);
            // _acceptAsset(i, 0, assetId); // Auto accepted
            unchecked {
                ++i;
            }
        }
    }

    function mint() public {
        mintWithAsset(_msgSender(), 1, _mainAssetId);
    }

    // CONTRACT URI

    /**
     * @notice Used to get whether the contract-level metadata is frozen and cannot be further updated.
     * @return isFrozen Whether the contract-level metadata is frozen
     */
    function isContractURIFrozen() external view returns (bool isFrozen) {
        isFrozen = _contractURIFrozen == 1;
    }

    /**
     * @notice Freezes the contract-level metadata, so it cannot be further updated.
     */
    function freezeContractURI() external onlyOwnerOrContributor {
        _contractURIFrozen = 1;
    }

    /**
     * @notice Sets the contract-level metadata URI to a new value and emits an event.
     * @param contractURI_ The new contract-level metadata URI
     */
    function setContractURI(
        string memory contractURI_
    ) external onlyOwnerOrContributor {
        if (_contractURIFrozen == 1) {
            revert ContractURIFrozen();
        }
        _contractURI = contractURI_;
        emit ContractURIUpdated();
    }

    // OTHER

    /**
     * @inheritdoc IERC165
     */
    function supportsInterface(
        bytes4 interfaceId
    )
    public
    view
    override(RMRKAbstractEquippable)
    returns (bool)
    {
        return RMRKAbstractEquippable.supportsInterface(interfaceId);
    }

    function setAutoAcceptAllCollections(
        bool autoAccept
    ) public virtual onlyOwnerOrContributor {
        _autoAcceptAllCollections = autoAccept;
    }

    function setAutoAcceptCollection(
        address collection,
        bool autoAccept
    ) public virtual onlyOwnerOrContributor {
        _autoAcceptCollection[collection] = autoAccept;
    }

    function lockSupply() external onlyOwnerOrContributor {
        _maxSupply = _totalSupply;
    }

    // HELPERS

    function _afterAddChild(
        uint256 tokenId,
        address childAddress,
        uint256 childId,
        bytes memory
    ) internal virtual override {
        // Auto accept children if autoaccept for all is enabled or if they are from known collections
        if (_autoAcceptAllCollections || _autoAcceptCollection[childAddress]) {
            _acceptChild(
                tokenId,
                _pendingChildren[tokenId].length - 1,
                childAddress,
                childId
            );
        }
    }

    function _beforeEquip(IntakeEquip memory data) internal override {
        _storeLastEquipUpdate(data.tokenId);
    }

    function _beforeUnequip(uint256 tokenId, uint64, uint64) internal override {
        _storeLastEquipUpdate(tokenId);
        emit MetadataUpdate(tokenId);
    }

    function _storeLastEquipUpdate(uint256 tokenId) private {
        _lastEquipUpdate[tokenId] = block.timestamp;
    }
}
