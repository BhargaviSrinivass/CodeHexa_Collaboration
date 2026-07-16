import { PrismaClient, Difficulty } from "@prisma/client";

const prisma = new PrismaClient();

const problems = [
  {
    slug: "two-sum",
    title: "Two Sum",
    difficulty: Difficulty.EASY,
    description: `Given an array of integers \`nums\` and an integer \`target\`, return indices of the two numbers such that they add up to \`target\`.

You may assume that each input would have exactly one solution, and you may not use the same element twice.

You can return the answer in any order.`,
    examples: [
      {
        input: "nums = [2,7,11,15], target = 9",
        output: "[0,1]",
        explanation: "Because nums[0] + nums[1] == 9, we return [0, 1].",
      },
      {
        input: "nums = [3,2,4], target = 6",
        output: "[1,2]",
      },
    ],
    constraints: [
      "2 <= nums.length <= 10^4",
      "-10^9 <= nums[i] <= 10^9",
      "-10^9 <= target <= 10^9",
      "Only one valid answer exists.",
    ],
    starterCode: `import java.util.*;

class Solution {
    public int[] twoSum(int[] nums, int target) {
        // Write your code here
        
    }
}`,
    testCases: [
      { input: "2 7 11 15\n9", expectedOutput: "0 1" },
      { input: "3 2 4\n6", expectedOutput: "1 2" },
      { input: "3 3\n6", expectedOutput: "0 1" },
    ],
  },
  {
    slug: "contains-duplicate",
    title: "Contains Duplicate",
    difficulty: Difficulty.EASY,
    description: `Given an integer array \`nums\`, return \`true\` if any value appears at least twice in the array, and return \`false\` if every element is distinct.`,
    examples: [
      {
        input: "nums = [1,2,3,1]",
        output: "true",
      },
      {
        input: "nums = [1,2,3,4]",
        output: "false",
      },
    ],
    constraints: [
      "1 <= nums.length <= 10^5",
      "-10^9 <= nums[i] <= 10^9",
    ],
    starterCode: `import java.util.*;

class Solution {
    public boolean containsDuplicate(int[] nums) {
        // Write your code here
        
    }
}`,
    testCases: [
      { input: "1 2 3 1", expectedOutput: "true" },
      { input: "1 2 3 4", expectedOutput: "false" },
      { input: "1 1 1 3 3 4 3 2 4 2", expectedOutput: "true" },
    ],
  },
  {
    slug: "best-time-to-buy-and-sell-stock",
    title: "Best Time to Buy and Sell Stock",
    difficulty: Difficulty.EASY,
    description: `You are given an array \`prices\` where \`prices[i]\` is the price of a given stock on the \`i\`th day.

You want to maximize your profit by choosing a single day to buy one stock and choosing a different day in the future to sell that stock.

Return the maximum profit you can achieve from this transaction. If you cannot achieve any profit, return \`0\`.`,
    examples: [
      {
        input: "prices = [7,1,5,3,6,4]",
        output: "5",
        explanation: "Buy on day 2 (price = 1) and sell on day 5 (price = 6), profit = 6-1 = 5.",
      },
      {
        input: "prices = [7,6,4,3,1]",
        output: "0",
      },
    ],
    constraints: [
      "1 <= prices.length <= 10^5",
      "0 <= prices[i] <= 10^4",
    ],
    starterCode: `class Solution {
    public int maxProfit(int[] prices) {
        // Write your code here
        
    }
}`,
    testCases: [
      { input: "7 1 5 3 6 4", expectedOutput: "5" },
      { input: "7 6 4 3 1", expectedOutput: "0" },
      { input: "2 4 1", expectedOutput: "2" },
    ],
  },
  {
    slug: "maximum-subarray",
    title: "Maximum Subarray",
    difficulty: Difficulty.MEDIUM,
    description: `Given an integer array \`nums\`, find the subarray with the largest sum, and return its sum.`,
    examples: [
      {
        input: "nums = [-2,1,-3,4,-1,2,1,-5,4]",
        output: "6",
        explanation: "The subarray [4,-1,2,1] has the largest sum 6.",
      },
      {
        input: "nums = [1]",
        output: "1",
      },
    ],
    constraints: [
      "1 <= nums.length <= 10^5",
      "-10^4 <= nums[i] <= 10^4",
    ],
    starterCode: `class Solution {
    public int maxSubArray(int[] nums) {
        // Write your code here
        
    }
}`,
    testCases: [
      { input: "-2 1 -3 4 -1 2 1 -5 4", expectedOutput: "6" },
      { input: "1", expectedOutput: "1" },
      { input: "5 4 -1 7 8", expectedOutput: "23" },
    ],
  },
  {
    slug: "merge-sorted-array",
    title: "Merge Sorted Array",
    difficulty: Difficulty.EASY,
    description: `You are given two integer arrays \`nums1\` and \`nums2\`, sorted in non-decreasing order, and two integers \`m\` and \`n\`, representing the number of elements in \`nums1\` and \`nums2\` respectively.

Merge \`nums2\` into \`nums1\` as one sorted array in non-decreasing order.

Return the merged sorted array as a space-separated string.`,
    examples: [
      {
        input: "nums1 = [1,2,3,0,0,0], m = 3, nums2 = [2,5,6], n = 3",
        output: "1 2 2 3 5 6",
      },
      {
        input: "nums1 = [1], m = 1, nums2 = [], n = 0",
        output: "1",
      },
    ],
    constraints: [
      "nums1.length == m + n",
      "nums2.length == n",
      "0 <= m, n <= 200",
      "1 <= m + n <= 200",
    ],
    starterCode: `import java.util.*;

class Solution {
    public int[] merge(int[] nums1, int m, int[] nums2, int n) {
        // Write your code here
        
    }
}`,
    testCases: [
      { input: "1 2 3 0 0 0\n3\n2 5 6\n3", expectedOutput: "1 2 2 3 5 6" },
      { input: "1\n1\n\n0", expectedOutput: "1" },
      { input: "4 5 6 0 0 0\n3\n1 2 3\n3", expectedOutput: "1 2 3 4 5 6" },
    ],
  },
];

async function main() {
  console.log("Seeding database...");

  for (const problem of problems) {
    await prisma.problem.upsert({
      where: { slug: problem.slug },
      update: problem,
      create: problem,
    });
  }

  console.log(`Seeded ${problems.length} problems.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
