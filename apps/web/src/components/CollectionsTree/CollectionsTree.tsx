import { useState, useEffect, useCallback } from 'react'
import { Tree, Spin } from 'antd'
import { FolderOutlined, FolderOpenOutlined } from '@ant-design/icons'
import type { DataNode } from 'antd/es/tree'
import type { CollectionsTreeProps, Collection } from '../../types'
import styles from './CollectionsTree.module.scss'

export const CollectionsTree: React.FC<CollectionsTreeProps> = ({
  collections,
  selectedCollectionId,
  onSelectCollection,
  loading = false,
  loadCollectionChildren,
}) => {
  // State to manage the tree data structure
  const [treeData, setTreeData] = useState<DataNode[]>([])

  // Convert a single collection to DataNode format
  const convertCollectionToNode = useCallback((collection: Collection): DataNode => {
    // Use hasChildren from the collection (not derived from isLeaf)
    // A collection can have both resources (isLeaf=true) and children (hasChildren=true)
    return {
      title: collection.name,
      key: collection.id,
      icon: collection.hasChildren ? <FolderOutlined /> : <FolderOpenOutlined />,
      isLeaf: !collection.hasChildren, // Ant Design Tree: isLeaf means no children to expand
      selectable: collection.isLeaf, // Only allow selection of collections with resources
      className: !collection.isLeaf ? 'non-selectable-tree-node' : undefined,
    }
  }, [])

  // Update tree data when collections prop changes
  useEffect(() => {
    if (collections.length > 0) {
      const nodes = collections.map(convertCollectionToNode)
      setTreeData(nodes)
    } else {
      setTreeData([])
    }
  }, [collections, convertCollectionToNode])

  // Handle lazy loading of children when a node is expanded
  const handleLoadData = useCallback(
    async (node: DataNode) => {
      // If children are already loaded or node is a leaf (no children to load), do nothing
      // Note: node.isLeaf in Ant Design Tree means the node has no children to expand
      if (node.isLeaf || (node.children && node.children.length > 0)) {
        return Promise.resolve()
      }

      // If loadCollectionChildren is not provided, do nothing
      if (!loadCollectionChildren) {
        return Promise.resolve()
      }

      try {
        // Load children for this collection
        const children = await loadCollectionChildren(node.key as string)

        // Update the tree data with the loaded children
        setTreeData((prevTreeData) => {
          const updateNode = (nodes: DataNode[]): DataNode[] => {
            return nodes.map((n) => {
              if (n.key === node.key) {
                return {
                  ...n,
                  children: children.map(convertCollectionToNode),
                }
              }
              if (n.children) {
                return {
                  ...n,
                  children: updateNode(n.children),
                }
              }
              return n
            })
          }
          return updateNode(prevTreeData)
        })
      } catch (error) {
        console.error('Failed to load collection children:', error)
      }
    },
    [loadCollectionChildren, convertCollectionToNode]
  )

  const handleSelect = useCallback(
    (selectedKeys: React.Key[]) => {
      if (selectedKeys.length > 0) {
        const collectionId = selectedKeys[0] as string
        // Find the node in the tree to check if it's a leaf
        const findNode = (nodes: DataNode[]): DataNode | null => {
          for (const node of nodes) {
            if (node.key === collectionId) {
              return node
            }
            if (node.children) {
              const found = findNode(node.children)
              if (found) return found
            }
          }
          return null
        }

        const node = findNode(treeData)
        // Only allow selection of leaf collections
        if (node && node.isLeaf) {
          onSelectCollection(collectionId)
        }
      } else {
        onSelectCollection(null)
      }
    },
    [treeData, onSelectCollection]
  )

  if (loading) {
    return (
      <div className={styles.loading}>
        <Spin size="large" />
      </div>
    )
  }

  return (
    <Tree
      showIcon
      defaultExpandAll={false}
      defaultExpandedKeys={['root']}
      selectedKeys={selectedCollectionId ? [selectedCollectionId] : []}
      treeData={treeData}
      loadData={loadCollectionChildren ? handleLoadData : undefined}
      onSelect={handleSelect}
      className={styles.collectionsTree}
    />
  )
}

