import useSynthetixQueries from '@synthetixio/queries';
import Wei, { wei } from '@synthetixio/wei';
import { ethers } from 'ethers';
import { formatBytes32String } from 'ethers/lib/utils';
import { debounce } from 'lodash';
import { useRouter } from 'next/router';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useRecoilState, useRecoilValue, useSetRecoilState } from 'recoil';

import {
	CROSS_MARGIN_ENABLED,
	DEFAULT_FUTURES_MARGIN_TYPE,
	DEFAULT_LEVERAGE,
} from 'constants/defaults';
import {
	CROSS_MARGIN_ORDER_TYPES,
	ISOLATED_MARGIN_ORDER_TYPES,
	ORDER_KEEPER_ETH_DEPOSIT,
} from 'constants/futures';
import Connector from 'containers/Connector';
import { ORDER_PREVIEW_ERRORS } from 'queries/futures/constants';
import { PositionSide, FuturesTradeInputs, FuturesAccountType } from 'queries/futures/types';
import { serializeGasPrice } from 'state/app/helpers';
import { setGasPrice } from 'state/app/reducer';
import { selectGasSpeed } from 'state/app/selectors';
import {
	clearTradePreviews,
	fetchCrossMarginTradePreview,
	fetchIsolatedMarginTradePreview,
	modifyIsolatedPosition,
} from 'state/futures/actions';
import { usePollMarketFuturesData } from 'state/futures/hooks';
import {
	setCrossMarginTradeInputs,
	setFuturesAccountType,
	setIsolatedMarginTradeInputs,
	setOrderType as setReduxOrderType,
} from 'state/futures/reducer';
import {
	selectCrossMarginBalanceInfo,
	selectCrossMarginAccount,
	selectMarketAssetRate,
	selectPosition,
	selectMaxLeverage,
	selectAboveMaxLeverage,
	selectCrossMarginSettings,
	selectFuturesType,
	selectLeverageSide,
	selectOrderType,
	selectTradeSizeInputs,
	selectIsolatedPriceImpact,
} from 'state/futures/selectors';
import { selectMarketAsset, selectMarketInfo } from 'state/futures/selectors';
import { useAppSelector, useAppDispatch } from 'state/hooks';
import {
	crossMarginMarginDeltaState,
	tradeFeesState,
	futuresAccountState,
	preferredLeverageState,
	simulatedTradeState,
	futuresOrderPriceState,
	orderFeeCapState,
	isAdvancedOrderState,
	dynamicFeeRateState,
} from 'store/futures';
import { computeMarketFee } from 'utils/costCalculations';
import { zeroBN, floorNumber, weiToString } from 'utils/formatters/number';
import { calculateMarginDelta, FuturesMarketKey, MarketKeyByAsset } from 'utils/futures';
import logError from 'utils/logError';

import useCrossMarginAccountContracts from './useCrossMarginContracts';
import usePersistedRecoilState from './usePersistedRecoilState';

const ZERO_TRADE_INPUTS = {
	nativeSize: '',
	susdSize: '',
	leverage: '',
};

const ZERO_FEES = {
	staticFee: zeroBN,
	crossMarginFee: zeroBN,
	dynamicFeeRate: zeroBN,
	keeperEthDeposit: zeroBN,
	limitStopOrderFee: zeroBN,
	total: zeroBN,
};

const useFuturesData = () => {
	const router = useRouter();
	const { t } = useTranslation();
	const { defaultSynthetixjs: synthetixjs, network, provider } = Connector.useContainer();
	const { crossMarginAvailable } = useRecoilValue(futuresAccountState);
	usePollMarketFuturesData();
	const dispatch = useAppDispatch();
	const crossMarginAddress = useAppSelector(selectCrossMarginAccount);

	const crossMarginBalanceInfo = useAppSelector(selectCrossMarginBalanceInfo);
	const { crossMarginAccountContract } = useCrossMarginAccountContracts();

	const gasSpeed = useAppSelector(selectGasSpeed);

	// TODO: Move to sdk and redux
	const { useEthGasPriceQuery } = useSynthetixQueries();
	const ethGasPriceQuery = useEthGasPriceQuery();

	useEffect(() => {
		const price = ethGasPriceQuery.data?.[gasSpeed];
		if (price) {
			dispatch(setGasPrice(serializeGasPrice(price)));
		}
	}, [ethGasPriceQuery.data, gasSpeed, dispatch]);

	const marketAsset = useAppSelector(selectMarketAsset);
	const setSimulatedTrade = useSetRecoilState(simulatedTradeState);

	const [crossMarginMarginDelta, setCrossMarginMarginDelta] = useRecoilState(
		crossMarginMarginDeltaState
	);
	const [tradeFees, setTradeFees] = useRecoilState(tradeFeesState);
	const [dynamicFeeRate, setDynamicFeeRate] = useRecoilState(dynamicFeeRateState);
	const feeCap = useRecoilValue(orderFeeCapState);
	const position = useAppSelector(selectPosition);
	const aboveMaxLeverage = useAppSelector(selectAboveMaxLeverage);
	const maxLeverage = useAppSelector(selectMaxLeverage);
	const tradeSizeInputs = useAppSelector(selectTradeSizeInputs);

	const { tradeFee: crossMarginTradeFee, stopOrderFee, limitOrderFee } = useAppSelector(
		selectCrossMarginSettings
	);
	const isAdvancedOrder = useRecoilValue(isAdvancedOrderState);
	const marketAssetRate = useAppSelector(selectMarketAssetRate);
	const orderPrice = useRecoilValue(futuresOrderPriceState);
	const [preferredLeverage] = usePersistedRecoilState(preferredLeverageState);
	const market = useAppSelector(selectMarketInfo);

	const [maxFee, setMaxFee] = useState(zeroBN);
	const [error, setError] = useState<string | null>(null);

	// perps v2
	const selectedAccountType = useAppSelector(selectFuturesType);
	const priceImpact = useAppSelector(selectIsolatedPriceImpact);
	const leverageSide = useAppSelector(selectLeverageSide);
	const orderType = useAppSelector(selectOrderType);

	const tradePrice = useMemo(() => wei(isAdvancedOrder ? orderPrice || zeroBN : marketAssetRate), [
		orderPrice,
		marketAssetRate,
		isAdvancedOrder,
	]);

	const crossMarginAccount = useMemo(() => {
		return crossMarginAvailable ? { freeMargin: crossMarginBalanceInfo.freeMargin } : null;
	}, [crossMarginBalanceInfo.freeMargin, crossMarginAvailable]);

	const freeMargin = useMemo(() => crossMarginAccount?.freeMargin ?? zeroBN, [
		crossMarginAccount?.freeMargin,
	]);

	const selectedLeverage = useMemo(() => {
		const leverage = preferredLeverage[marketAsset] || DEFAULT_LEVERAGE;
		return String(Math.min(maxLeverage.toNumber(), Number(leverage)));
	}, [preferredLeverage, marketAsset, maxLeverage]);

	const remainingMargin: Wei = useMemo(() => {
		if (selectedAccountType === 'isolated_margin') {
			return position?.remainingMargin || zeroBN;
		}
		const positionMargin = position?.remainingMargin || zeroBN;
		const accountMargin = crossMarginAccount?.freeMargin || zeroBN;
		return positionMargin.add(accountMargin);
	}, [position?.remainingMargin, crossMarginAccount?.freeMargin, selectedAccountType]);

	const clearTradePreview = useCallback(() => {
		dispatch(clearTradePreviews());
		setTradeFees(ZERO_FEES);
	}, [dispatch, setTradeFees]);

	const resetTradeState = useCallback(() => {
		dispatch(setCrossMarginTradeInputs(ZERO_TRADE_INPUTS));
		dispatch(setIsolatedMarginTradeInputs(ZERO_TRADE_INPUTS));
		setSimulatedTrade(ZERO_TRADE_INPUTS);
		setCrossMarginMarginDelta(zeroBN);
		clearTradePreview();
	}, [setSimulatedTrade, clearTradePreview, setCrossMarginMarginDelta, dispatch]);

	const maxUsdInputAmount = useMemo(() => {
		if (selectedAccountType === 'isolated_margin') {
			return maxLeverage.mul(remainingMargin);
		}
		if (aboveMaxLeverage && position?.position?.side === leverageSide) {
			return zeroBN;
		}

		const totalMargin =
			position?.position?.side === leverageSide
				? freeMargin
				: freeMargin.add(position?.remainingMargin ?? zeroBN);

		let maxUsd = totalMargin.mul(selectedLeverage);
		if (position?.position?.side !== leverageSide) {
			const notionalValue = position?.position?.size.mul(tradePrice);
			maxUsd = maxUsd.add(notionalValue ?? zeroBN);
		}

		maxUsd = maxUsd.sub(maxFee.mul(selectedLeverage));
		let buffer = maxUsd.mul(0.01);

		return maxUsd.abs().sub(buffer);
	}, [
		selectedLeverage,
		maxLeverage,
		maxFee,
		aboveMaxLeverage,
		freeMargin,
		remainingMargin,
		leverageSide,
		tradePrice,
		selectedAccountType,
		position?.position?.size,
		position?.remainingMargin,
		position?.position?.side,
	]);

	const advancedOrderFeeRate = useMemo(() => {
		switch (orderType) {
			case 'limit':
				return limitOrderFee;
			case 'stop market':
				return stopOrderFee;
			default:
				return zeroBN;
		}
	}, [orderType, limitOrderFee, stopOrderFee]);

	const getCrossMarginEthBal = useCallback(async () => {
		if (!crossMarginAddress) return zeroBN;
		const bal = await provider.getBalance(crossMarginAddress);
		return wei(bal);
	}, [crossMarginAddress, provider]);

	const calculateCrossMarginFee = useCallback(
		(susdSizeDelta: Wei) => {
			if (orderType !== 'limit' && orderType !== 'stop market') return zeroBN;
			const advancedOrderFeeRate = orderType === 'limit' ? limitOrderFee : stopOrderFee;
			return susdSizeDelta.abs().mul(advancedOrderFeeRate);
		},
		[orderType, stopOrderFee, limitOrderFee]
	);

	const totalFeeRate = useCallback(
		async (sizeDelta: Wei) => {
			const staticRate = computeMarketFee(market, sizeDelta);

			let total = crossMarginTradeFee.add(dynamicFeeRate).add(staticRate).add(advancedOrderFeeRate);

			return total;
		},
		[market, crossMarginTradeFee, dynamicFeeRate, advancedOrderFeeRate]
	);

	const calculateFees = useCallback(
		async (susdSizeDelta: Wei, nativeSizeDelta: Wei) => {
			if (!synthetixjs) return ZERO_FEES;

			const susdSize = susdSizeDelta.abs();
			const staticRate = computeMarketFee(market, nativeSizeDelta);
			const tradeFee = susdSize.mul(staticRate).add(susdSize.mul(dynamicFeeRate));

			const currentDeposit =
				orderType === 'limit' || orderType === 'stop market'
					? await getCrossMarginEthBal()
					: zeroBN;
			const requiredDeposit = currentDeposit.lt(ORDER_KEEPER_ETH_DEPOSIT)
				? ORDER_KEEPER_ETH_DEPOSIT.sub(currentDeposit)
				: zeroBN;

			const crossMarginFee =
				selectedAccountType === 'cross_margin' ? susdSize.mul(crossMarginTradeFee) : zeroBN;
			const limitStopOrderFee = calculateCrossMarginFee(susdSizeDelta);
			const tradeFeeWei = wei(tradeFee);

			const fees = {
				staticFee: tradeFeeWei,
				crossMarginFee: crossMarginFee,
				dynamicFeeRate,
				keeperEthDeposit: requiredDeposit,
				limitStopOrderFee: limitStopOrderFee,
				total: tradeFeeWei.add(crossMarginFee).add(limitStopOrderFee),
			};
			setTradeFees(fees);
			return fees;
		},
		[
			synthetixjs,
			market,
			dynamicFeeRate,
			orderType,
			getCrossMarginEthBal,
			selectedAccountType,
			crossMarginTradeFee,
			calculateCrossMarginFee,
			setTradeFees,
		]
	);

	// eslint-disable-next-line
	const debounceFetchPreview = useCallback(
		debounce(async (nextTrade: FuturesTradeInputs, fromLeverage = false) => {
			setError(null);
			try {
				const fees = await calculateFees(nextTrade.susdSizeDelta, nextTrade.nativeSizeDelta);
				let nextMarginDelta = zeroBN;
				if (selectedAccountType === 'isolated_margin') {
					dispatch(fetchIsolatedMarginTradePreview(nextTrade.nativeSizeDelta));
				} else {
					nextMarginDelta =
						nextTrade.nativeSizeDelta.abs().gt(0) || fromLeverage
							? await calculateMarginDelta(nextTrade, fees, position)
							: zeroBN;
					setCrossMarginMarginDelta(nextMarginDelta);
					dispatch(
						fetchCrossMarginTradePreview({
							price: nextTrade.orderPrice,
							marginDelta: nextMarginDelta,
							sizeDelta: nextTrade.nativeSizeDelta,
						})
					);
				}
			} catch (err) {
				if (Object.values(ORDER_PREVIEW_ERRORS).includes(err.message)) {
					setError(err.message);
				} else {
					setError(t('futures.market.trade.preview.error'));
				}
				clearTradePreview();
				logError(err);
			}
		}, 500),
		[
			setError,
			calculateFees,
			calculateMarginDelta,
			position,
			orderPrice,
			orderType,
			selectedAccountType,
			logError,
			setCrossMarginMarginDelta,
		]
	);

	const onStagePositionChange = useCallback(
		(trade: FuturesTradeInputs) => {
			if (selectedAccountType === 'isolated_margin') {
				dispatch(
					setIsolatedMarginTradeInputs({
						susdSize: trade.susdSize,
						nativeSize: trade.nativeSize,
						leverage: trade.leverage,
					})
				);
			} else {
				dispatch(
					setCrossMarginTradeInputs({
						susdSize: trade.susdSize,
						nativeSize: trade.nativeSize,
						leverage: trade.leverage,
					})
				);
			}

			setSimulatedTrade(null);
			debounceFetchPreview(trade);
		},
		[dispatch, setSimulatedTrade, debounceFetchPreview, selectedAccountType]
	);

	const onTradeAmountChange = useCallback(
		(
			value: string,
			usdPrice: Wei,
			currencyType: 'usd' | 'native',
			options?: { simulateChange?: boolean; crossMarginLeverage?: Wei }
		) => {
			if (!value || usdPrice.eq(0)) {
				resetTradeState();
				return;
			}
			const positiveTrade = leverageSide === PositionSide.LONG;
			const nativeSize = currencyType === 'native' ? wei(value) : wei(value).div(usdPrice);
			const usdSize = currencyType === 'native' ? usdPrice.mul(value) : wei(value);
			const changeEnabled = remainingMargin.gt(0) && value !== '';
			const isolatedMarginLeverage = changeEnabled ? usdSize.div(remainingMargin).abs() : zeroBN;

			const inputLeverage =
				selectedAccountType === 'cross_margin'
					? options?.crossMarginLeverage ?? wei(selectedLeverage)
					: isolatedMarginLeverage;
			let leverage = remainingMargin.eq(0) ? zeroBN : inputLeverage;
			leverage = maxLeverage.gt(leverage) ? leverage : maxLeverage;

			const newTradeInputs = {
				nativeSize: changeEnabled
					? weiToString(positiveTrade ? nativeSize.abs() : nativeSize.abs().neg())
					: '',
				susdSize: changeEnabled ? weiToString(positiveTrade ? usdSize : usdSize.neg()) : '',
				nativeSizeDelta: positiveTrade ? nativeSize.abs() : nativeSize.abs().neg(),
				susdSizeDelta: positiveTrade ? usdSize : usdSize.neg(),
				orderPrice: usdPrice,
				leverage: String(floorNumber(leverage)),
			};

			if (options?.simulateChange) {
				// Allows us to keep it snappy updating the input values
				setSimulatedTrade({
					...newTradeInputs,
					orderPrice: newTradeInputs.orderPrice.toString(),
				});
			} else {
				onStagePositionChange(newTradeInputs);
			}
		},
		[
			remainingMargin,
			maxLeverage,
			selectedLeverage,
			selectedAccountType,
			leverageSide,
			resetTradeState,
			setSimulatedTrade,
			onStagePositionChange,
		]
	);

	const onChangeOpenPosLeverage = useCallback(
		async (leverage: number) => {
			debounceFetchPreview(
				{
					leverage: String(leverage),
					nativeSize: '0',
					susdSize: '0',
					susdSizeDelta: zeroBN,
					nativeSizeDelta: zeroBN,
				},
				true
			);
		},
		[debounceFetchPreview]
	);

	const onTradeOrderPriceChange = useCallback(
		(price: string) => {
			if (price && tradeSizeInputs.susdSize) {
				// Recalc the trade
				onTradeAmountChange(tradeSizeInputs.susdSize, wei(price), 'usd');
			}
		},
		[tradeSizeInputs.susdSize, onTradeAmountChange]
	);

	const submitCrossMarginOrder = useCallback(
		async (fromEditLeverage?: boolean, gasLimit?: Wei | null) => {
			if (!crossMarginAccountContract) return;
			if (orderType === 'market' || fromEditLeverage) {
				const newPosition = [
					{
						marketKey: formatBytes32String(MarketKeyByAsset[marketAsset] as FuturesMarketKey),
						marginDelta: crossMarginMarginDelta.toBN(),
						sizeDelta: tradeSizeInputs.nativeSizeDelta.toBN(),
					},
				];
				return await crossMarginAccountContract.distributeMargin(newPosition, {
					gasLimit: gasLimit?.toBN(),
				});
			}
			const enumType = orderType === 'limit' ? 0 : 1;

			return await crossMarginAccountContract.placeOrderWithFeeCap(
				formatBytes32String(MarketKeyByAsset[marketAsset] as FuturesMarketKey),
				crossMarginMarginDelta.toBN(),
				tradeSizeInputs.nativeSizeDelta.toBN(),
				wei(orderPrice).toBN(),
				enumType,
				feeCap.toBN(),
				{ value: tradeFees.keeperEthDeposit.toBN() }
			);
		},
		[
			crossMarginAccountContract,
			marketAsset,
			orderPrice,
			orderType,
			feeCap,
			crossMarginMarginDelta,
			tradeSizeInputs.nativeSizeDelta,
			tradeFees.keeperEthDeposit,
		]
	);

	const submitIsolatedMarginOrder = useCallback(async () => {
		dispatch(
			modifyIsolatedPosition({
				sizeDelta: tradeSizeInputs.nativeSize,
				priceImpactDelta: priceImpact,
				delayed: orderType === 'delayed',
			})
		);
	}, [dispatch, tradeSizeInputs, priceImpact, orderType]);

	useEffect(() => {
		const getMaxFee = async () => {
			if (remainingMargin.eq(0) || tradePrice.eq(0)) {
				return;
			}
			try {
				const totalMargin =
					position?.position?.side === leverageSide
						? freeMargin
						: freeMargin.add(position?.remainingMargin ?? zeroBN);

				let maxUsd = totalMargin.mul(selectedLeverage);
				if (position?.position?.side !== leverageSide) {
					maxUsd = maxUsd.add(position?.position?.notionalValue ?? zeroBN);
				}
				const totalRate = await totalFeeRate(maxUsd);
				const totalMaxFee = maxUsd.mul(totalRate);
				setMaxFee(totalMaxFee);
			} catch (e) {
				logError(e);
			}
		};
		getMaxFee();
	}, [
		setMaxFee,
		totalFeeRate,
		leverageSide,
		position?.remainingMargin,
		position?.position?.notionalValue,
		position?.position?.side,
		remainingMargin,
		freeMargin,
		tradePrice,
		selectedLeverage,
	]);

	useEffect(() => {
		if (selectedAccountType === 'cross_margin' && !CROSS_MARGIN_ORDER_TYPES.includes(orderType)) {
			dispatch(setReduxOrderType('market'));
		} else if (
			selectedAccountType === 'isolated_margin' &&
			!ISOLATED_MARGIN_ORDER_TYPES.includes(orderType)
		) {
			dispatch(setReduxOrderType('delayed'));
		}
		onTradeAmountChange(tradeSizeInputs.susdSize, tradePrice, 'usd');

		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [dispatch, selectedAccountType, orderType, network.id]);

	useEffect(() => {
		const handleRouteChange = () => {
			resetTradeState();
		};
		router.events.on('routeChangeStart', handleRouteChange);
		return () => {
			router.events.off('routeChangeStart', handleRouteChange);
		};
	}, [router.events, resetTradeState]);

	useEffect(() => {
		if (tradeSizeInputs.susdSizeDelta.eq(0)) return;
		onTradeAmountChange(tradeSizeInputs.susdSize, tradePrice, 'usd');
		// Only want to react to leverage side change
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [leverageSide]);

	useEffect(() => {
		resetTradeState();
		// Clear trade state when switching address
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [crossMarginAddress]);

	useEffect(() => {
		if (!CROSS_MARGIN_ENABLED) {
			dispatch(setFuturesAccountType(DEFAULT_FUTURES_MARGIN_TYPE));
			return;
		}
		const routerType =
			typeof router.query.accountType === 'string'
				? (router.query.accountType as FuturesAccountType)
				: DEFAULT_FUTURES_MARGIN_TYPE;
		const accountType = ['cross_margin', 'isolated_margin'].includes(routerType)
			? routerType
			: DEFAULT_FUTURES_MARGIN_TYPE;
		dispatch(setFuturesAccountType(accountType));
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [dispatch, router.query.accountType]);

	useEffect(() => {
		const getDynamicFee = async () => {
			if (!synthetixjs) return;
			const dynamicFeeRate = await synthetixjs.contracts.Exchanger.dynamicFeeRateForExchange(
				ethers.utils.formatBytes32String('sUSD'),
				ethers.utils.formatBytes32String(marketAsset)
			);
			setDynamicFeeRate(wei(dynamicFeeRate.feeRate));
		};
		getDynamicFee();
	}, [marketAsset, setDynamicFeeRate, synthetixjs]);

	return {
		onTradeAmountChange,
		submitIsolatedMarginOrder,
		submitCrossMarginOrder,
		resetTradeState,
		onTradeOrderPriceChange,
		onChangeOpenPosLeverage,
		marketAssetRate,
		position,
		market,
		maxUsdInputAmount,
		tradeFees,
		selectedLeverage,
		error,
		debounceFetchPreview,
		tradePrice,
	};
};

export default useFuturesData;
