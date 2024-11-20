// SPDX-License-Identifier: Apache-2.0

pragma solidity ^0.8.21;

import {
    RMRKTypedMultiAsset
} from "../../../RMRK/extension/typedMultiAsset/RMRKTypedMultiAsset.sol";
import {RMRKNestableMultiAssetMock} from "../../RMRKNestableMultiAssetMock.sol";
import {
    RMRKNestableMultiAsset
} from "../../../RMRK/nestable/RMRKNestableMultiAsset.sol";

contract RMRKNestableTypedMultiAssetMock is
    RMRKNestableMultiAssetMock,
    RMRKTypedMultiAsset
{
    function supportsInterface(
        bytes4 interfaceId
    )
        public
        view
        virtual
        override(RMRKNestableMultiAsset, RMRKTypedMultiAsset)
        returns (bool)
    {
        return
            RMRKTypedMultiAsset.supportsInterface(interfaceId) ||
            RMRKNestableMultiAsset.supportsInterface(interfaceId);
    }

    function addTypedAssetEntry(
        uint64 assetId,
        string memory metadataURI,
        string memory type_
    ) external {
        _addAssetEntry(assetId, metadataURI);
        _setAssetType(assetId, type_);
    }
}
