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
  // Map to track hasResources and hasChildren for all loaded collections (including nested children)
  const [collectionPropsMap, setCollectionPropsMap] = useState<Map<string, { hasResources: boolean; hasChildren: boolean }>>(new Map())

  // Convert a single collection to DataNode format
  const convertCollectionToNode = useCallback((collection: Collection): DataNode => {
    // A collection can have both resources (hasResources=true) and children (hasChildren=true)
    // A collection is selectable if it has resources OR if it's a leaf node (both hasChildren and hasResources are false)
    const isSelectable = collection.hasResources || (!collection.hasChildren && !collection.hasResources)
    
    return {
      title: collection.name,
      key: collection.id,
      icon: collection.hasChildren ? <FolderOutlined /> : <FolderOpenOutlined />,
      isLeaf: !collection.hasChildren, // Ant Design Tree: isLeaf means no children to expand
      selectable: true, // Always allow onSelect to be called, we'll filter in handleSelect
      className: !isSelectable ? 'non-selectable-tree-node' : undefined,
      // Store hasResources and hasChildren as custom properties for easy lookup
      hasResources: collection.hasResources,
      hasChildren: collection.hasChildren,
    } as DataNode & { hasResources: boolean; hasChildren: boolean }
  }, [])

  // Update tree data when collections prop changes
  useEffect(() => {
    if (collections.length > 0) {
      const nodes = collections.map(convertCollectionToNode)
      setTreeData(nodes)
      // Update collection properties map
      setCollectionPropsMap((prevMap) => {
        const newMap = new Map(prevMap)
        collections.forEach((collection) => {
          newMap.set(collection.id, {
            hasResources: collection.hasResources,
            hasChildren: collection.hasChildren,
          })
        })
        return newMap
      })
    } else {
      setTreeData([])
      setCollectionPropsMap(new Map())
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

        // Update collection properties map with loaded children
        setCollectionPropsMap((prevMap) => {
          const newMap = new Map(prevMap)
          children.forEach((collection) => {
            newMap.set(collection.id, {
              hasResources: collection.hasResources,
              hasChildren: collection.hasChildren,
            })
          })
          return newMap
        })

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
        
        // Get collection properties from our map
        const props = collectionPropsMap.get(collectionId)
        const hasResources = props?.hasResources ?? false
        const hasChildren = props?.hasChildren ?? false
        
        // Allow selection if:
        // 1. Collection has resources (existing behavior), OR
        // 2. Collection is a leaf node with no resources (both hasChildren and hasResources are false)
        if (hasResources || (!hasChildren && !hasResources)) {
          onSelectCollection(collectionId)
        }
      } else {
        onSelectCollection(null)
      }
    },
    [collectionPropsMap, onSelectCollection]
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

