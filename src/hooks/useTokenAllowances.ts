import { batch, contract } from '@pooltogether/etherplex'
import { default as ERC20Abi } from '../abis/ERC20Abi'
import { formatUnits } from '@ethersproject/units'
import useReadProvider from './useReadProvider'
import { useQuery, useQueryClient } from 'react-query'
import { QUERY_KEYS } from '../constants'
import populatePerIdCache from '../utils/populatePerIdCache'
import { sToMs } from '@pooltogether/utilities'

/**
 * Returns a dictionary keyed by the provided token addresses filled with
 * the provided spenders allowance for the provided user for the each token
 * @param chainId
 * @param usersAddress
 * @param spenderAddress
 * @param tokenAddresses
 * @returns
 */
const useTokenAllowances = (
  chainId: number,
  usersAddress: string,
  spenderAddress: string,
  tokenAddresses: string[]
) => {
  const { readProvider, isReadProviderReady } = useReadProvider(chainId)
  const queryClient = useQueryClient()

  const enabled =
    isReadProviderReady &&
    Boolean(usersAddress) &&
    Boolean(spenderAddress) &&
    tokenAddresses.reduce((aggregate, current) => aggregate && Boolean(current), true) &&
    Array.isArray(tokenAddresses) &&
    tokenAddresses.length > 0 &&
    Boolean(chainId)

  const getCacheKey = (id: (string | number)[]) => [
    QUERY_KEYS.tokenAllowances,
    chainId,
    usersAddress,
    spenderAddress,
    id
  ]

  return useQuery(
    getCacheKey(tokenAddresses),
    async () =>
      await getTokenAllowances(readProvider, usersAddress, spenderAddress, tokenAddresses),
    {
      enabled,
      onSuccess: (data) => populatePerIdCache(queryClient, getCacheKey, data),
      refetchInterval: sToMs(30)
    }
  )
}

/**
 * Returns the provided spenders allowance for the provided user for the provided token
 * @param chainId
 * @param usersAddress
 * @param spenderAddress
 * @param tokenAddress
 * @returns
 */
export const useTokenAllowance = (
  chainId: number,
  usersAddress: string,
  spenderAddress: string,
  tokenAddress: string
) => {
  const { data: tokenAllowances, ...queryData } = useTokenAllowances(
    chainId,
    usersAddress,
    spenderAddress,
    [tokenAddress]
  )
  return { ...queryData, data: tokenAllowances ? tokenAllowances[tokenAddress] : null }
}

const getTokenAllowances = async (readProvider, usersAddress, spenderAddress, tokenAddresses) => {
  const batchCalls = []
  tokenAddresses.map((tokenAddress) => {
    const tokenContract = contract(tokenAddress, ERC20Abi, tokenAddress)
    batchCalls.push(tokenContract.allowance(usersAddress, spenderAddress).decimals())
  })
  const response = await batch(readProvider, ...batchCalls)
  const result = {}
  Object.keys(response).map((tokenAddress) => {
    const allowanceUnformatted = response[tokenAddress].allowance[0]
    const decimals = response[tokenAddress].decimals[0]
    result[tokenAddress] = {
      isAllowed: !allowanceUnformatted.isZero(),
      allowance: formatUnits(allowanceUnformatted, decimals),
      allowanceUnformatted,
      decimals
    }
  })
  return result
}

export default useTokenAllowances
