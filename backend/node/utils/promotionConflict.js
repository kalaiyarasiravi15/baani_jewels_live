const { Op } = require('sequelize');

// A target may have one live promotion at a time.  Scheduled and expired
// records do not block a new target selection.
const findLiveTargetConflict = async (Model, activeField, target, excludeId = null) => {
    const now = new Date();
    const where = {
        [activeField]: true,
        targetType: target.type,
        [Op.or]: [{ startDate: null }, { startDate: { [Op.lte]: now } }],
        [Op.and]: [{
            [Op.or]: [{ expiryDate: null }, { expiryDate: { [Op.gt]: now } }]
        }]
    };
    if (target.type === 'PRODUCT') where[Model.rawAttributes.productId ? 'productId' : 'targetProductId'] = target.productId;
    if (target.type === 'CATEGORY') where.targetCategoryId = target.categoryId;
    if (target.type === 'COLLECTION') where.targetCollectionId = target.collectionId;
    if (excludeId) where.id = { [Op.ne]: excludeId };
    return Model.findOne({ where });
};

module.exports = { findLiveTargetConflict };
